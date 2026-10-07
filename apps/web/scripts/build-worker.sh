#!/usr/bin/env sh

set -e

bun run opennextjs-cloudflare build "$@"

for route in robots.txt sitemap.xml; do
  cp ".next/server/app/$route.body" ".open-next/assets/$route"
done
