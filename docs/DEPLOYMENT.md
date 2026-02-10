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

## 2. Build and run with nginx

The nginx image **does not build the frontend**; it uses the pre-built `frontend/dist/`. Build the frontend locally (or in CI) before building the nginx image, and ensure `frontend/dist/` exists (e.g. commit dist to the repo or copy it into the build context).

```bash
# From repo root — build frontend first (if not already in repo)
cd frontend && npm run build && cd ..

# Then build nginx image (copies frontend/dist into image) and run
docker compose -f docker-compose.yml -f docker-compose.nginx.yml build nginx
docker compose -f docker-compose.yml -f docker-compose.nginx.yml up -d
```

Ensure DNS for both hostnames points to this server. Ports 80 and 443 must be open.

## 3. Build frontend only (for static deploy elsewhere)

To produce a static build without Docker:

```bash
cd frontend
VITE_API_BASE_URL=https://api-ksagar-aetosvision-ai.encryptedbar.com/api/v1 npm run build
```

Output is in `frontend/dist/`. You can upload that to any static host and point the API at your backend URL.

## 4. Optional: run without dev frontend

With nginx serving the built app, you can stop the dev frontend container to save resources:

```bash
docker compose -f docker-compose.yml -f docker-compose.nginx.yml up -d backend postgres redis pgadmin nginx
```
