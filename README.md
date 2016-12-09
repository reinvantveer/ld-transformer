# LD transformer
Simple Linked Data transformer for CSV using JSON-LD

## Rationale
Many RDF transformers already exist, but none are as straightforward as this one. A lot of transformers suffer from the burden of a heavy RDF serialization library. This package doesn't. It's as lightweight as JSON was intended. It supports both n-triples output, and raw JSON-LD for ingestion in a number of stores, including MongoDB, ElasticSearch or perhaps something more exotic, like RavenDB.
Its use is intended as a library (its usage is to be read from the tests for now), but it can be run as below.

## Usage:
Clone the repository and run `npm install`. Then, run:
`npm start -i [inputdir] -o [outputdir] -f [n-triples or json-ld]

## The plugin system
One great advantage to this transformer is that it implements a plugin system that allows pre- and post-processing of data. Using this system, data can be cleaned, transformed or mapped to a controlled vocabulary.

Plugins are just exported functions. The requirements are that a plugin exports a single function, which returns a promise with the converted value that was. The second requirement is that it returns a rejected promise if the required input parameters are used in the wrong way :)

So something like this (but then useful):
```js
module.exports = somevar => {
  return new Promise((resolve, reject) => somevar ? resolve(true) : reject(false));
};
```

## Features (unchecked is TODO)
- [X] Require all keys to be mapped to a LD property
- [X] Output n-triples
- [X] Output JSON-LD
- [X] Create md5 schema hashes from csv -> json schema
- [X] Strip `required` fields from json schema (schemas should be the same regardless their 0..1 or 1..1 property cardinalities)
- [X] Plugin system 
- [X] Plugin for reprojecting NL RD WKT to WGS84
- [ ] Plugin for generic WKT reprojection from/to any CRS 
- [ ] Plugin for prefixing values to URIs
- [ ] Plugin for nesting keys and objects
