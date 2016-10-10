#!/usr/bin/env bash
rm data/disk.nq
rm data/ultimo.nq
time node bin/transform.js -f data/GCB_Ultimo.xlsx\ -\ Blad1.csv -c data/ultimo.context.json -o data/ultimo.nq
time node bin/transform.js -f data/GCB_DISK.xlsx\ -\ Blad1.csv -c data/disk.context.json -o data/disk.nq
