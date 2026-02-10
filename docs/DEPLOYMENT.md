# Production deployment (nginx + HTTPS)

## Domains

- **App:** https://ksagar-aetosvision-ai.encryptedbar.com  
- **API:** https://api-ksagar-aetosvision-ai.encryptedbar.com  
- **pgAdmin:** https://pgadmin.ksagar-aetosvision-ai.encryptedbar.com  

## 1. SSL certificates (Let's Encrypt)

Create certificates for both hostnames (or use a wildcard `*.encryptedbar.com` and use the same path for both nginx server blocks):

```bash
# Example with certbot (adjust for your setup)
sudo certbot certonly --webroot -w /var/www/certbot \
  -d ksagar-aetosvision-ai.encryptedbar.com
sudo certbot certonly --webroot -w /var/www/certbot \
  -d api-ksagar-aetosvision-ai.encryptedbar.com
sudo certbot certonly --webroot -w /var/www/certbot \
  -d pgadmin.ksagar-aetosvision-ai.encryptedbar.com
```

Certificates are expected at:

- `/etc/letsencrypt/live/ksagar-aetosvision-ai.encryptedbar.com/fullchain.pem`
- `/etc/letsencrypt/live/ksagar-aetosvision-ai.encryptedbar.com/privkey.pem`
- `/etc/letsencrypt/live/pgadmin.ksagar-aetosvision-ai.encryptedbar.com/fullchain.pem`
- `/etc/letsencrypt/live/pgadmin.ksagar-aetosvision-ai.encryptedbar.com/privkey.pem`

If you use one wildcard cert, point both nginx `ssl_certificate` / `ssl_certificate_key` to the same directory in `nginx.conf`.

## 2. Build and run with nginx

The nginx image **does not build the frontend**; it uses the pre-built `frontend/dist/`. Build the frontend locally (or in CI) before building the nginx image, and ensure `frontend/dist/` exists (e.g. commit dist to the repo or copy it into the build context).

**API URL for server deployment:** The app uses a relative API base (`/api/v1` by default). Nginx proxies `location /api/` to the backend, so do **not** set `VITE_API_BASE_URL` when building for this setup (or set it to `/api/v1`). That way all API requests go to the same origin and nginx forwards them to the backend.

```bash
# From repo root — build frontend first (no VITE_API_BASE_URL = same-origin /api/v1)
cd frontend && npm run build && cd ..

# Then build nginx image (copies frontend/dist into image) and run
docker compose -f docker-compose.yml -f docker-compose.nginx.yml build nginx
docker compose -f docker-compose.yml -f docker-compose.nginx.yml up -d
```

**Stopping:** Use the same two compose files so nginx is stopped and the `backend` network is removed:
`docker compose -f docker-compose.yml -f docker-compose.nginx.yml down`. Running only `docker compose down` stops backend/postgres/redis/pgadmin but leaves nginx running.

Ensure DNS for all hostnames (app, API, pgAdmin) points to this server. Ports 80 and 443 must be open.

## 3. Build frontend only (for static deploy elsewhere)

To produce a static build when the frontend is served from a **different host** than the API, set the full API URL:

```bash
cd frontend
VITE_API_BASE_URL=https://ksagar-aetosvision-ai.encryptedbar.com/api/v1 npm run build
```

Output is in `frontend/dist/`. For the **same-server nginx setup** (Section 2), omit `VITE_API_BASE_URL` so the app uses `/api/v1` (same origin).

## 4. Optional: run without dev frontend

With nginx serving the built app, you can stop the dev frontend container to save resources:

```bash
docker compose -f docker-compose.yml -f docker-compose.nginx.yml up -d backend postgres redis pgadmin nginx
```
