#!/usr/bin/env bash
# Run this once on the VPS to bootstrap Let's Encrypt certs, then leave the
# certbot service running in docker-compose.yml to handle renewal.
#
# Usage: ./deploy/init-letsencrypt.sh
# Requires DOMAIN and CERTBOT_EMAIL to be set in .env (project root).

set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo ".env not found. Copy .env.compose.example to .env and set DOMAIN/CERTBOT_EMAIL first." >&2
  exit 1
fi
set -a; source .env; set +a

if [ -z "${DOMAIN:-}" ] || [ -z "${CERTBOT_EMAIL:-}" ]; then
  echo "DOMAIN and CERTBOT_EMAIL must be set in .env" >&2
  exit 1
fi

RSA_KEY_SIZE=4096
DUMMY_PATH="/etc/letsencrypt/live/$DOMAIN"

echo "### Creating dummy certificate for $DOMAIN ..."
docker compose run --rm --entrypoint sh certbot -c "
  mkdir -p '$DUMMY_PATH' && \
  openssl req -x509 -nodes -newkey rsa:$RSA_KEY_SIZE -days 1 \
    -keyout '$DUMMY_PATH/privkey.pem' \
    -out '$DUMMY_PATH/fullchain.pem' \
    -subj '/CN=localhost'"

echo "### Starting nginx with dummy certificate ..."
docker compose up -d nginx

echo "### Deleting dummy certificate for $DOMAIN ..."
docker compose run --rm --entrypoint sh certbot -c "
  rm -rf /etc/letsencrypt/live/$DOMAIN /etc/letsencrypt/archive/$DOMAIN /etc/letsencrypt/renewal/$DOMAIN.conf"

echo "### Requesting real Let's Encrypt certificate for $DOMAIN ..."
docker compose run --rm --entrypoint certbot certbot certonly --webroot -w /var/www/certbot \
    -d "$DOMAIN" \
    --email "$CERTBOT_EMAIL" \
    --rsa-key-size $RSA_KEY_SIZE \
    --agree-tos \
    --no-eff-email \
    --force-renewal

echo "### Reloading nginx with real certificate ..."
docker compose exec nginx nginx -s reload

echo "Done. Certs will auto-renew via the certbot service."
