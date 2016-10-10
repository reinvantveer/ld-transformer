'use strict';

const argv = require('yargs')
  .usage('Usage: $0 -f [csv path] -c [context file path] -o [output file path]')
  .demand(['f', 'c', 'o'])
  .argv;

const transformer = require('../lib/transformer.js');
const fs = require('fs');

function run(args) {
  const context = JSON.parse(fs.readFileSync(args.c, 'utf-8'));
  if (fs.existsSync(args.o)) throw Error(`Output file ${args.o} already exists`);
  if (!fs.existsSync(args.c)) throw Error(`Context file ${args.c} not found`);
  if (!fs.existsSync(args.f)) throw Error(`Input csv file ${args.f} not found`);

  transformer.csvParse(args.f)
    .then(csvData => {
      transformer.checkKeys(csvData, context);
      transformer.checkContext(context);
      return transformer.transform(csvData, context);
    })
    .then(rdf => fs.writeFileSync(args.o, rdf.join('')))
    .catch(err => { throw err; });
}

run(argv);
