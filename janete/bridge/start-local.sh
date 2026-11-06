#!/bin/sh
set -eu
cd "$(dirname "$0")"
if [ ! -f .env ] || [ ! -f extension/config.js ]; then
  printf '%s\n' 'Execute ./setup-local.sh primeiro.' >&2
  exit 1
fi
set -a
. ./.env
set +a
exec node server.js
