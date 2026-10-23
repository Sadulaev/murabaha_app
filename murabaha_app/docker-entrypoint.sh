#!/bin/sh
set -eu

mkdir -p /srv/www
find /srv/www -mindepth 1 -maxdepth 1 -exec rm -rf {} +
cp -a /app/out/. /srv/www/

trap 'exit 0' TERM INT
while true; do
  sleep 3600 &
  wait $! || true
done
