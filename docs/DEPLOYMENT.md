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
- `/etc/letsencrypt/live/api-ksagar-aetosvision-ai.encryptedbar.com/fullchain.pem`
- `/etc/letsencrypt/live/api-ksagar-aetosvision-ai.encryptedbar.com/privkey.pem`
- `/etc/letsencrypt/live/pgadmin.ksagar-aetosvision-ai.encryptedbar.com/fullchain.pem`
- `/etc/letsencrypt/live/pgadmin.ksagar-aetosvision-ai.encryptedbar.com/privkey.pem`

If you use one wildcard cert, point both nginx `ssl_certificate` / `ssl_certificate_key` to the same directory in `nginx.conf`.

## 2. Run with nginx (Vite dev server, no dist)

Deployment uses the **Vite dev server** (`npm run dev`), not a pre-built `dist/`. Nginx proxies the main app to the frontend container.

```bash
# From repo root — build images and start all services (includes frontend dev server)
docker compose -f docker-compose.yml -f docker-compose.nginx.yml build
docker compose -f docker-compose.yml -f docker-compose.nginx.yml up -d
```

Ensure DNS for all hostnames points to this server. Ports 80 and 443 must be open. The frontend container runs with `VITE_API_BASE_URL=https://api-ksagar-aetosvision-ai.encryptedbar.com/api/v1`.

## 3. Build frontend only (for static deploy elsewhere)

To produce a static build without Docker:

```bash
cd frontend
VITE_API_BASE_URL=https://api-ksagar-aetosvision-ai.encryptedbar.com/api/v1 npm run build
```

Output is in `frontend/dist/`. You can upload that to any static host and point the API at your backend URL.
