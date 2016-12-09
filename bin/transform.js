'use strict';

const argv = require('yargs')
  .usage('Usage: $0 -i [csv path] -o [output file path] -c [context file path] -f [output format]')
  .demand(['i', 'o', 'c', 'f'])
  .argv;

const transformer = require('../lib/transformer.js');
const fs = require('fs');

const formats = require('../formats.json');
const plugins = transformer.loadPlugins('../lib/plugins/');

function run(args) {
  const supportedFormats = ['json-ld', 'n-quads'];
  const format = args.f;
  if (!fs.existsSync(args.i)) throw Error(`Input csv file ${args.i} not found`);
  if (fs.existsSync(args.o)) throw Error(`Output file ${args.o} already exists`);
  if (!fs.existsSync(args.c)) throw Error(`Context file ${args.c} not found`);
  if (supportedFormats.indexOf(format) < 0) throw Error(`Output format ${format} not supported`);

  const context = JSON.parse(fs.readFileSync(args.c, 'utf-8'));
  transformer.csvParse(args.i)
    .then(csvData => {
      transformer.checkKeys(csvData, context);
      transformer.checkContext(context);
      return transformer.transform(csvData, context, args.f);
    })
    .then(rdf => fs.writeFileSync(args.o, formats[format].header + rdf.join(formats[format].lineSeparator) + formats[format].footer))
    .catch(err => { throw err; });
}

run(argv);
