#!/bin/sh
set -eu

DOMAIN="murabaha95.ru"
LIVE="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
KEY="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"

relax_certs() {
  if [ ! -d /etc/letsencrypt/archive ]; then
    return 0
  fi
  find /etc/letsencrypt/live /etc/letsencrypt/archive -type d -exec chmod 755 {} +
  find /etc/letsencrypt/live /etc/letsencrypt/archive -type f -exec chmod 644 {} +
}

write_config() {
  if [ -f "$LIVE" ] && [ -f "$KEY" ]; then
    relax_certs
    cp /etc/nginx/templates/https.conf /etc/nginx/conf.d/default.conf
  else
    cp /etc/nginx/templates/http.conf /etc/nginx/conf.d/default.conf
  fi
  nginx -t
}

issue_cert() {
  certbot certonly \
    --webroot -w /var/www/certbot \
    --non-interactive \
    --agree-tos \
    --no-eff-email \
    --keep-until-expiring \
    --email "$CERTBOT_EMAIL" \
    -d murabaha95.ru \
    -d www.murabaha95.ru
}

mkdir -p /var/www/certbot /var/log/letsencrypt /etc/letsencrypt

write_config
nginx -g "daemon off;" &
nginx_pid=$!

trap 'kill -TERM "$nginx_pid" 2>/dev/null || true; wait "$nginx_pid" 2>/dev/null || true; exit 0' TERM INT

if [ ! -f "$LIVE" ]; then
  if [ -z "${CERTBOT_EMAIL:-}" ]; then
    echo "CERTBOT_EMAIL is not set. Serving HTTP only until a certificate exists."
  else
    echo "Requesting Let's Encrypt certificate for murabaha95.ru and www.murabaha95.ru"
    if issue_cert; then
      write_config && nginx -s reload || echo "HTTPS config failed; staying on the previous nginx config"
    else
      echo "certbot failed; staying on HTTP and retrying later"
    fi
  fi
fi

interval=900
if [ -f "$LIVE" ]; then
  interval=43200
fi

while true; do
  sleep "$interval" &
  wait $! || true

  if [ -z "${CERTBOT_EMAIL:-}" ]; then
    continue
  fi

  if [ -f "$LIVE" ]; then
    certbot renew --webroot -w /var/www/certbot --quiet || true
    relax_certs
    nginx -s reload || true
    interval=43200
  elif issue_cert; then
    write_config && nginx -s reload || echo "HTTPS config failed; staying on the previous nginx config"
    interval=43200
  fi
done
