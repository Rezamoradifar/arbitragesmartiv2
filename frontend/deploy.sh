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

# --- Configuration --------------------------------------------------------
#
# The live values live in frontend/.env.production, which is committed and
# which Next.js loads automatically. This script does NOT duplicate them.
#
# That is deliberate and was learned the hard way: this script used to write
# an .env.local containing a hardcoded contract address, and .env.local wins
# over .env.production. So a deploy that pulled a corrected address happily
# rebuilt the site with the stale one and reported success. A second copy of a
# value is not a convenience, it is a way to be wrong quietly.
#
# To override for a particular server, export the variable before running —
# only then is an .env.local written, and only with what you overrode.
say() { printf "\n\033[1;32m==>\033[0m %s\n" "$1"; }
die() { printf "\n\033[1;31mERROR:\033[0m %s\n" "$1" >&2; exit 1; }

if [ -n "${WALLETCONNECT_ID:-}" ] && ! [[ "$WALLETCONNECT_ID" =~ ^[0-9a-fA-F]{32}$ ]]; then
  die "WALLETCONNECT_ID must be 32 hex characters (got: '${WALLETCONNECT_ID}'). The app would fall back to MetaMask-only."
fi

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
#
# Nothing is written unless something was actually overridden. A leftover
# .env.local from an earlier deploy is removed rather than left to shadow the
# committed values — that shadowing is the single most confusing failure this
# script can produce, because the build succeeds and serves the wrong data.
# Written as a loop rather than `[ -n x ] && VAR=...` lines: under `set -e` a
# false test at the end of such a line exits non-zero and kills the script, so
# not overriding anything would abort the deploy.
#
# .env.local is not only used for public overrides. It is also the only place
# the assistant's API key can live, because that key is a real credential and
# .env.production is committed. Removing the file wholesale to clear a stale
# public override therefore also deletes the key — and nothing fails: the
# build succeeds, the site serves, and the assistant silently drops to its
# offline written-guide fallback until somebody notices it stopped answering
# free-form questions. So anything that is not a NEXT_PUBLIC_ key this script
# manages is read out first and written back.
PRESERVED=""
if [ -f .env.local ]; then
  PRESERVED="$(grep -v '^NEXT_PUBLIC_' .env.local || true)"
fi

OVERRIDES=""
for pair in \
  "APP_URL:NEXT_PUBLIC_APP_URL" \
  "CONTRACT:NEXT_PUBLIC_CONTRACT_ADDRESS" \
  "COLLATERAL:NEXT_PUBLIC_COLLATERAL_ADDRESS" \
  "WALLETCONNECT_ID:NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID" \
  "POLYGON_RPC:NEXT_PUBLIC_POLYGON_RPC_URL"
do
  src="${pair%%:*}"
  dest="${pair##*:}"
  val="${!src:-}"
  if [ -n "$val" ]; then
    OVERRIDES="${OVERRIDES}${dest}=${val}"$'\n'
  fi
done

if [ -n "$OVERRIDES" ] || [ -n "$PRESERVED" ]; then
  if [ -n "$OVERRIDES" ]; then
    say "Writing .env.local with your overrides"
  else
    say "Rewriting .env.local — clearing stale public overrides, keeping secrets"
  fi
  { [ -n "$PRESERVED" ] && printf '%s\n' "$PRESERVED"; printf '%s' "$OVERRIDES"; } > .env.local
  chmod 600 .env.local
  # Values are masked: this file holds the assistant's API key, and deploy
  # output ends up in scrollback, CI logs and screenshots.
  sed -E 's/=.*/=<set>/' .env.local | sed 's/^/  /'
else
  say "Using committed .env.production"
fi

# The assistant needs a key to answer anything beyond its written topics.
# Saying so here is the difference between a deliberate choice and a silent
# regression nobody spots for a month.
if ! grep -q '^ASSISTANT_API_KEY=' .env.local 2>/dev/null && [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  say "NOTE: no ASSISTANT_API_KEY in .env.local — the assistant will answer only from its written topics."
fi

# Print what the build will actually use, so a wrong address is visible here
# rather than three screens into a browser session.
say "Effective configuration"
# `|| true`: grep exits 2 when .env.local is absent, which is the normal case
# and must not abort the deploy under `set -e`.
grep -E '^NEXT_PUBLIC_' .env.local .env.production 2>/dev/null | sed 's/^/  /' || true

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
