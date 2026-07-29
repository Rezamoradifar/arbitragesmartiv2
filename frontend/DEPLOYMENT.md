# ArbiSmart Frontend — VPS Deployment (PM2 + nginx)

Verified in this repo: `npm run build` completes successfully with type
checking enabled (no `ignoreBuildErrors`), and every route returns HTTP 200
with rendered content under `npm run start`:

| Route | Purpose |
| --- | --- |
| `/` | Landing page — plans, referral tiers, security summary, live protocol stats |
| `/dashboard` | User panel — stake, top up, upgrade, claim, referrals, exit |
| `/security` | What the owner can and cannot do, plus known limitations |
| `/partners` | Partner governance — emergency and rescue votes, voting body |
| `/activity` | Event-sourced feed decoded from on-chain logs |
| `/admin` | Owner console — pause, partners, rescue, fees, blacklist, arbitrage |

Unknown routes correctly return 404.

## 1. Install dependencies and configure environment

```bash
cd ~/projects/arbitragesmartiv2/frontend
npm install
cp .env.example .env.local
nano .env.local
```

Fill in real values:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Deployed and verified ArbiSmartV2 address |
| `NEXT_PUBLIC_COLLATERAL_ADDRESS` | Must match the contract's `collateralToken()` |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | From WalletConnect Cloud |
| `NEXT_PUBLIC_POLYGON_RPC_URL` | Private RPC provider, not the public endpoint |

Every variable is `NEXT_PUBLIC_*`, so all of them are bundled into the client
and visible to users. Never put a secret here.

**The RPC endpoint matters.** The `/activity` page queries roughly 200,000
blocks of logs in one call. Public endpoints commonly reject or truncate range
queries that large, and the page will show an error telling the user exactly
that. A private provider (Alchemy, Infura, QuickNode) fixes it.

## 2. Build and run

```bash
npm run build
npm run start   # listens on :3000
```

## 3. Run under PM2

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup    # follow the printed instruction to persist across reboots
```

## 4. Put nginx in front

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then issue TLS:

```bash
sudo certbot --nginx -d your-domain.com
```

## 5. Redeploying after a contract change

The ABI is committed at `lib/abi.json` and is generated from the compiled
contract. After changing and rebuilding `src/ArbiSmartV2.sol`, regenerate it
so the interface cannot silently drift from what is deployed:

```bash
cd ..                       # repo root
forge build
python3 -c "import json; d=json.load(open('out/ArbiSmartV2.sol/ArbiSmartV2.json')); json.dump(d['abi'], open('frontend/lib/abi.json','w'), indent=2)"
cd frontend && npm run build
```

## Build note

`next.config.js` aliases a handful of `@x402/*` modules to `false`. They are
optional payment packages that `@coinbase/cdp-sdk` imports lazily through the
Base Account connector RainbowKit pulls in. This app never reaches that code
path, but webpack resolves imports statically and fails without the stub.
