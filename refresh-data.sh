#!/usr/bin/env bash
rm data/target/*.nq
rm data/target/*.json
node bin/transform.js -i data/source/GCB_DISK.xlsx\ -\ beheerobjecten.csv -o ./data/target/beheerobjecten.nq -c ./data/context/disk.beheerobjecten.context.json -f n-quads
node bin/transform.js -i data/source/GCB_DISK.xlsx\ -\ beheerobjecten.csv -o ./data/target/beheerobjecten.ld.json -c ./data/context/disk.beheerobjecten.context.json -f json-ld