#!/usr/bin/env bash
# Builds dist/survivors-hutan.zip for itch.io: index.html at the zip root, src/ minus debug.js
# (only loaded via ?debug), and the runtime sheets. Keep SHEETS in step with loadSheets in src/main.js.
set -e
cd "$(dirname "$0")/.."

SHEETS="mage enemies fx world ui"

rm -rf dist
mkdir -p dist/stage/art/out
cp index.html dist/stage/
cp -r src dist/stage/
rm dist/stage/src/debug.js
for s in $SHEETS; do
  cp "art/out/$s.png" "art/out/$s.json" dist/stage/art/out/
done
(cd dist/stage && python3 -m zipfile -c ../survivors-hutan.zip index.html src art)
echo "built dist/survivors-hutan.zip ($(stat -c %s dist/survivors-hutan.zip) bytes)"
