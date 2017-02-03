/**
 * Created by vagrant on 2/3/17.
 */

'use strict';

const csvReader = require('./lib/csvReader');
const mongoWriter = require('./lib/mongoWriter');
const schemaAnalyzer = require('./lib/schemaAnalyzer');
const transformer = require('./lib/transformer');

module.exports = { csvReader, mongoWriter, schemaAnalyzer, transformer };
