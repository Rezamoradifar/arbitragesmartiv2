#!/usr/bin/env bash
#
# One-shot deploy for the ArbiSmart frontend on a fresh Ubuntu/Debian VPS.
# Run it ON THE SERVER, as a user with sudo:
#
#   bash deploy.sh
#
# Idempotent: safe to re-run after a git pull to ship an update.

set -euo pipefail

REPO="https://github.com/Rezamoradifar/arbitragesmartiv2.git"
BRANCH="claude/arbismartv2-contract-setup-qz72zv"
APP_DIR="$HOME/arbitragesmartiv2"
DOMAIN="arbhub.site"
PORT="${PORT:-3001}"

# --- Values baked from the live deployment -------------------------------
#
# Every one of these is a NEXT_PUBLIC_* value, meaning it is compiled into the
# client bundle and readable by anyone who opens devtools. None of them are
# secrets, so committing them costs nothing and saves a manual step.
#
# The WalletConnect project id in particular is public by design — it
# identifies the project to the relay, it does not authenticate anything. What
# protects it is the allowed-domains list in the Reown dashboard, which is why
# arbhub.site must be added there.
#
# Override any of them by exporting the variable before running.
CONTRACT="${CONTRACT:-0xDCcc0561b36809454584ED1038824ca06B86c1d6}"
COLLATERAL="${COLLATERAL:-0xc2132D05D31c914a87C6611C10748AEb04B58e8F}"
APP_URL="${APP_URL:-https://arbhub.site}"
WALLETCONNECT_ID="${WALLETCONNECT_ID:-00a6d669500a837d18aa4adeb86fc783}"
POLYGON_RPC="${POLYGON_RPC:-https://polygon.gateway.tenderly.co}"

say() { printf "\n\033[1;32m==>\033[0m %s\n" "$1"; }
die() { printf "\n\033[1;31mERROR:\033[0m %s\n" "$1" >&2; exit 1; }

[[ "$WALLETCONNECT_ID" =~ ^[0-9a-fA-F]{32}$ ]] || \
  die "WALLETCONNECT_ID must be 32 hex characters (got: '${WALLETCONNECT_ID}'). The app would fall back to MetaMask-only."

# --- 1. Node 20 -----------------------------------------------------------
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -c2-3)" -lt 20 ] 2>/dev/null; then
  say "Installing Node 20"
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
say "Node $(node -v), npm $(npm -v)"

command -v git >/dev/null 2>&1 || sudo apt-get install -y git

# --- 2. Source ------------------------------------------------------------
if [ -d "$APP_DIR/.git" ]; then
  say "Updating existing checkout"
  git -C "$APP_DIR" fetch origin "$BRANCH"
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  say "Cloning $BRANCH"
  git clone -b "$BRANCH" "$REPO" "$APP_DIR"
fi

cd "$APP_DIR/frontend"

# --- 3. Environment -------------------------------------------------------
say "Writing .env.local"
cat > .env.local <<EOF
NEXT_PUBLIC_APP_URL=$APP_URL
NEXT_PUBLIC_CONTRACT_ADDRESS=$CONTRACT
NEXT_PUBLIC_COLLATERAL_ADDRESS=$COLLATERAL
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=$WALLETCONNECT_ID
NEXT_PUBLIC_POLYGON_RPC_URL=$POLYGON_RPC
EOF
chmod 600 .env.local

# --- 4. Build -------------------------------------------------------------
say "Installing dependencies"
npm install --no-audit --no-fund

say "Building"
npm run build

# --- 5. PM2 ---------------------------------------------------------------
command -v pm2 >/dev/null 2>&1 || sudo npm install -g pm2

say "Writing ecosystem.config.js for port $PORT"
cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [
    {
      name: "arbismart-frontend",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p $PORT",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
EOF

say "Starting under PM2"
pm2 delete arbismart-frontend >/dev/null 2>&1 || true
pm2 start ecosystem.config.js
pm2 save --force
say "Run the command pm2 prints below once, so the app survives reboots:"
pm2 startup | tail -2 || true

# --- 6. nginx -------------------------------------------------------------
command -v nginx >/dev/null 2>&1 || sudo apt-get install -y nginx

say "Configuring nginx for $DOMAIN"
sudo tee /etc/nginx/sites-available/arbismart >/dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/arbismart /etc/nginx/sites-enabled/arbismart
# The stock welcome page would otherwise win on the default server block.
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# --- 7. TLS ---------------------------------------------------------------
say "Checking DNS before requesting a certificate"
RESOLVED="$(getent hosts "$DOMAIN" | awk '{print $1}' | head -1 || true)"
MYIP="$(curl -fsS --max-time 10 https://api.ipify.org || echo unknown)"

if [ "$RESOLVED" != "$MYIP" ]; then
  cat <<EOF

  DNS is not pointing here yet.
      $DOMAIN currently resolves to : ${RESOLVED:-nothing}
      this server is                : $MYIP

  Certbot would fail, so TLS is being skipped. Update the A record for
  $DOMAIN (and www) to $MYIP, wait for it to propagate, then run:

      sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN

  Browser wallets refuse to inject over plain HTTP, so the connect button
  will not work until that certificate exists.

EOF
else
  command -v certbot >/dev/null 2>&1 || sudo apt-get install -y certbot python3-certbot-nginx
  say "Requesting certificate"
  sudo certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email || \
    echo "certbot failed — re-run manually: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
fi

say "Done. Local check:"
curl -s -o /dev/null -w "  http://127.0.0.1:$PORT  ->  %{http_code}\n" http://127.0.0.1:$PORT/ || true
pm2 status arbismart-frontend || true
