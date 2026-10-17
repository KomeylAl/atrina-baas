#!/bin/sh
set -eu

export HOSTNAME=0.0.0.0
export PORT="${PORT:-5050}"

node ./node_modules/prisma/build/index.js migrate deploy
exec node server.js
