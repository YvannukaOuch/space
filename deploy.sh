#!/usr/bin/env bash
# Build and publish to https://space.sraas.dev (static files served by Caddy).
set -euo pipefail
TARGET="${DEPLOY_TARGET:-sraas}"
npm run build
tar czf - -C dist . | ssh "$TARGET" 'mkdir -p /var/www/space && rm -rf /var/www/space/* && tar xzf - -C /var/www/space && chmod -R a+rX /var/www/space'
echo "> Done: https://space.sraas.dev"
