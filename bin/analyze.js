/**
 * Created by reinvantveer on 12/13/16.
 */

'use strict';

const argv = require('yargs')
  .usage('Usage: $0 -i [csv path] -e [extension with dot]')
  .demand(['i', 'e'])
  .argv;

const schemaAnalyzer = require('../lib/schemaAnalyzer.js');

schemaAnalyzer.analyzeFolderRecursive(argv.i, argv.e)
  .then(console.log)
  .catch(console.error);
