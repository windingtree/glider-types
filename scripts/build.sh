#!/usr/bin/env bash

rm -rf dist types
mkdir -p dist types
wget -O dist/simard.yaml https://qa.payment.simard.io/api/docs/simard.yaml
# wget -O dist/derbysoft.yaml https://qa.hotels.simard.io/v1/docs/yaml
cp src/derbysoft-proxy.yaml dist/derbysoft.yaml
wget -O dist/win.yaml https://raw.githubusercontent.com/windingtree/win-backend/main/swagger/swagger.yaml
node scripts/parse.js
npx json2ts --unreachableDefinitions --input dist/simard.json --output types/simard.d.ts
npx json2ts --unreachableDefinitions --input dist/derbysoft.json --output types/derbysoft.d.ts
npx json2ts --unreachableDefinitions --input dist/win.json --output types/win.d.ts
cp index.js dist/index.js
cp index.d.ts types/index.d.ts
