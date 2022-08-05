#!/usr/bin/env bash

rm -rf dist types
mkdir -p dist types
wget -O dist/simard.yaml https://qa.payment.simard.io/api/docs/simard.yaml
wget -O dist/derbysoft.yaml https://qa.hotels.simard.io/v1/docs/yaml
node scripts/parse.js
npx json2ts --unreachableDefinitions --input dist/simard.json --output types/simard.d.ts
npx json2ts --unreachableDefinitions --input dist/derbysoft.json --output types/derbysoft.d.ts
cp index.js dist/index.js
cp index.d.ts types/index.d.ts

# rm -rf types
# mkdir -p types/org.json
# mkdir -p types/vc
# mkdir -p types/nft
# mkdir -p types/orgVc
# mkdir -p types/trustAssertion
# node ./scripts/bundle.js
# npx json2ts ./build/org.json > types/org.json/index.d.ts
# npx json2ts ./build/vc.json > types/vc/index.d.ts
# npx json2ts ./build/nft.json > types/nft/index.d.ts
# npx json2ts ./build/orgVc.json > types/orgVc/index.d.ts
# npx json2ts ./build/trustAssertion.json > types/trustAssertion/index.d.ts
# npx tsc -p ./tsconfig-build.json
