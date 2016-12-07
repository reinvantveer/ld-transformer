# LD transformer
Simple Linked Data transformer for CSV using JSON-LD

## Rationale
Many RDF transformers already exist, but none are as straightforward as this one. A lot of transformers suffer from the burden of a heavy RDF serialization library. This package doesn't. It's as lightweight as JSON was intended. It supports both n-triples output, and raw JSON-LD for ingestion in a number of stores, including MongoDB, ElasticSearch or perhaps something more exotic, like RavenDB.
Its use is intended as a library (its usage is to be read from the tests for now), but it can be run as below.

## Usage:
Clone the repository and run `npm install`. Then, run:
`npm start -i [inputdir] -o [outputdir] -f [n-triples or json-ld]

## Features (unchecked is TODO)
- [X] Require all keys to be mapped to a LD property
- [X] Output n-triples
- [X] Output JSON-LD
- [X] Create md5 schema hashes from csv -> json schema
- [ ] Strip required fields from json schema (schemas are the same regardless their 0..1 or 1..1 property cardinalities)
- [ ] Create plugin system for creating keys, mapping values and nesting objects
