#!/bin/bash
# Copies the web app into www/ for the native shell. Run from the repo root.
set -e
cd "$(dirname "$0")/.."
rm -rf www && mkdir www
cp index.html manifest.json sw.js version.json terms.html privacy.html icon.svg icon-*.png www/
cp -R js www/js
echo "www ready: $(find www -type f | wc -l) files"
