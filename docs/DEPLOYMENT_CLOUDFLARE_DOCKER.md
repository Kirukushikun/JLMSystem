# Deployment Guide — Cloudflare Tunnel + Docker (with Reverb WebSocket)

This guide covers deploying the JL Monitoring System on a server that uses **Cloudflare Tunnel** (`cloudflared`) as the reverse proxy and **Docker Compose** as the container runtime. No nginx or Apache is needed on the host — Cloudflare handles HTTPS termination and routing.

---

## Server Architecture

```
Internet (HTTPS)
      │
      ▼
Cloudflare Network (handles SSL/TLS)
      │
      ▼
cloudflared (running on host, listening on 127.0.0.1:PORT)
      │
      ├── jlmsystem.bfcgroup.ph     → localhost:8002  → Docker: jlms_app (Apache + Laravel)
      └── ws.jlmsystem.bfcgroup.ph  → localhost:8003  → Docker: jlms_reverb (Reverb WebSocket)
```

---

## Prerequisites

- A server with Docker and Docker Compose installed
- `cloudflared` installed and a tunnel already created
- The tunnel's credentials JSON file on the server (e.g. `/home/user/.cloudflared/<tunnel-id>.json`)
- Access to the Cloudflare dashboard for your domain (or someone who does)
- The Laravel project in a folder like `/var/www/jlm-system/JLMSystem/`

---

## Step 1: Dockerfile — Add `pcntl` Extension

Reverb requires the `pcntl` PHP extension for signal handling (`SIGINT`/`SIGTERM`). Without it, the container will crash with `Undefined constant "SIGINT"`.

In your `Dockerfile`, add `pcntl` to the `docker-php-ext-install` line:

```dockerfile
RUN docker-php-ext-install gd pdo pdo_mysql zip pcntl
```

Full relevant section:

```dockerfile
RUN apt-get update && apt-get install -y \
    libpng-dev libjpeg-dev libfreetype6-dev zip unzip nano libzip-dev curl git \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install gd pdo pdo_mysql zip pcntl
```

---

## Step 2: docker-compose.yml — Add Reverb Service

Add a dedicated `reverb` service. It reuses the same Docker image as `app` but overrides the command to run Reverb instead of Apache.

```yaml
services:
  app:
    build: .
    container_name: jlms_app
    restart: unless-stopped
    ports:
      - "8002:80"
    volumes:
      - ./JLMSystem:/var/www/html
    working_dir: /var/www/html
    depends_on:
      - db
    environment:
      APACHE_DOCUMENT_ROOT: /var/www/html/public

  reverb:
    build: .
    container_name: jlms_reverb
    restart: unless-stopped
    ports:
      - "8003:8080"        # host port 8003 → container port 8080
    volumes:
      - ./JLMSystem:/var/www/html
    working_dir: /var/www/html
    command: php artisan reverb:start --host=0.0.0.0 --port=8080
    depends_on:
      - db

  db:
    image: mysql:8.0
    container_name: jlms_db
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: strongpassword
      MYSQL_DATABASE: jlms_database
      MYSQL_USER: jlms_user
      MYSQL_PASSWORD: strongpassword
    volumes:
      - jlms_db_data:/var/lib/mysql

  redis:
    image: redis:alpine
    container_name: jlms_redis
    restart: always

volumes:
  jlms_db_data:
```

> Each project on the same server should use a different **host port** for both `app` and `reverb` to avoid conflicts (e.g. 8002/8003 for this project, 8004/8005 for another).

---

## Step 3: Cloudflare Tunnel Config — Add WebSocket Hostname

Edit `/etc/cloudflared/config.yml` and add an ingress rule for the Reverb WebSocket subdomain:

```yaml
tunnel: 6c88f295-6ba1-48f2-9eb8-1df628211291
credentials-file: /home/iverson/.cloudflared/6c88f295-6ba1-48f2-9eb8-1df628211291.json

ingress:
  - hostname: jlmsystem.bfcgroup.ph
    service: http://localhost:8002
  - hostname: jlms-ws.bfcgroup.ph
    service: http://127.0.0.1:8003      # points to the reverb container
  - service: http_status:404
```

> Cloudflare Tunnel supports WebSockets natively — no extra configuration needed for the tunnel itself.

---

## ⚠️ Critical: WebSocket Subdomain Must Be First-Level

Cloudflare's free Universal SSL certificate covers:
- `bfcgroup.ph` (root)
- `*.bfcgroup.ph` — one level deep (e.g. `jlms-ws.bfcgroup.ph` ✅)

It does **NOT** cover second-level subdomains like `ws.jlmsystem.bfcgroup.ph` ❌. If you use a second-level subdomain, the SSL handshake fails before the WebSocket request even reaches Reverb — and the error in the browser will just say "WebSocket connection failed" with no obvious reason.

**Always use a first-level subdomain for the WebSocket service:**
- ✅ `jlms-ws.bfcgroup.ph`
- ❌ `ws.jlmsystem.bfcgroup.ph`

To get wildcard coverage for second-level subdomains you would need Cloudflare's paid Advanced Certificate Manager.

---

## Step 4: Add DNS Record in Cloudflare Dashboard

The tunnel config tells `cloudflared` where to route traffic, but a DNS record is still needed so the subdomain resolves through the tunnel.

**Option A — Via CLI** (requires `cert.pem` / `cloudflared tunnel login`):
```bash
cloudflared tunnel route dns <tunnel-id> ws.jlmsystem.bfcgroup.ph
```

**Option B — Via Dashboard** (use this if `cert.pem` is not available on the server):
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → select your domain
2. **DNS** → **Records** → **Add record**
3. Fill in:
   - **Type:** `CNAME`
   - **Name:** `jlms-ws` (must be first-level — see warning above about SSL coverage)
   - **Target:** `<tunnel-id>.cfargotunnel.com`
   - **Proxy status:** Proxied (orange cloud ON)
4. Save

---

## Step 5: Production `.env`

Update the `.env` inside the Laravel project (`/var/www/jlm-system/JLMSystem/.env`):

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://jlmsystem.bfcgroup.ph

# Turnstile — must be true in production
TURNSTILE_VERIFY=true
TURNSTILE_SITE_KEY=your_real_site_key
TURNSTILE_SECRET_KEY=your_real_secret_key

# Reverb — use the WebSocket subdomain and HTTPS
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=your_reverb_id
REVERB_APP_KEY=your_reverb_key
REVERB_APP_SECRET=your_reverb_secret
REVERB_HOST=jlms-ws.bfcgroup.ph
REVERB_PORT=443
REVERB_SCHEME=https

VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"

# Firebase — backend credentials
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Firebase — frontend credentials (baked into JS bundle at build time)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_VAPID_KEY=
```

> `VITE_*` variables are baked into the JavaScript bundle at build time. Always update them in `.env` **before** running `npm run build`.

---

## Step 6: Build and Deploy

```bash
# On the host — pull latest code
cd /var/www/jlm-system/JLMSystem
git pull origin main

# Enter the app container to build assets and run migrations
sudo docker compose exec app bash

    composer install --no-dev --optimize-autoloader
    npm install
    npm run build
    php artisan migrate --force
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache

exit

# Restart cloudflared to pick up the new tunnel config
sudo systemctl restart cloudflared

# Rebuild images (needed if Dockerfile changed) and restart all containers
sudo docker compose up -d --build
```

---

## Step 7: Verify Reverb is Running

```bash
sudo docker compose logs reverb
```

Expected output:
```
jlms_reverb  |
jlms_reverb  |    INFO  Starting server on 0.0.0.0:8080 (ws.jlmsystem.bfcgroup.ph).
jlms_reverb  |
```

If you see `Undefined constant "SIGINT"`, the `pcntl` extension is missing — go back to Step 1 and rebuild.

---

## Troubleshooting

### Bell not connecting (WebSocket error in console)
- Check that `REVERB_HOST` in `.env` is the subdomain (`ws.jlmsystem.bfcgroup.ph`), not `localhost`
- Confirm the DNS CNAME record is live: `nslookup ws.jlmsystem.bfcgroup.ph`
- Check Reverb logs: `sudo docker compose logs reverb`
- Make sure `npm run build` was run **after** updating `REVERB_HOST` in `.env`

### FCM push not arriving
- Confirm the site is on HTTPS (FCM requires it)
- Check the `fcm_tokens` table has entries — if empty, the browser never granted permission or `registerFcmToken()` silently failed
- Check browser console for service worker registration errors
- Confirm `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` are set in `.env`
- Confirm all `VITE_FIREBASE_*` values were in `.env` before `npm run build`

### Turnstile "Human verification failed" on production
- Confirm `TURNSTILE_VERIFY=true` in `.env`
- Confirm `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` are the **production** keys from dash.cloudflare.com, not the test keys
- Run `php artisan config:cache` after any `.env` change

### Container keeps restarting
```bash
sudo docker compose logs app      # Apache/Laravel errors
sudo docker compose logs reverb   # Reverb errors
```

---

## Maintenance

### Restart only Reverb
```bash
sudo docker compose restart reverb
```

### View live Reverb logs
```bash
sudo docker compose logs -f reverb
```

### Re-deploy after code changes
```bash
git pull origin main
sudo docker compose exec app bash -c "composer install --no-dev -o && npm run build && php artisan migrate --force && php artisan config:cache && php artisan route:cache"
sudo docker compose up -d
```
