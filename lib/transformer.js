'use strict';

const csv = require('csv');
const GS = require('generate-schema');
const fs = require('fs');
const jsonld = require('jsonld');
const _ = require('lodash');
const Promise = require('bluebird');

function csvParse(filePath) {
  return new Promise((resolve, reject) => {
    csv.parse(fs.readFileSync(filePath), { columns: true }, (parseErr, csvData) => {
      if (parseErr) return reject(parseErr);
      return resolve(csvData);
    });
  });
}

function csv2jsonSchema(filePath) {
  return csvParse(filePath)
    .then(GS.json)
    .catch(err => { throw err; });
}
function checkKeys(csvData, context) {
  const missingKeys = [];

  Object.keys(csvData[0]).forEach(key => {
    if (!_.has(context, '@context.' + key)) missingKeys.push(key);
  });

  const bootstrapContext = {};
  missingKeys
    .forEach(missingKey => { bootstrapContext[missingKey] = 'prefix:' + missingKey; });
  if (missingKeys.length) throw Error(`Add ${JSON.stringify(bootstrapContext, null, 2)} to context file.`);
}

function checkContext(context) {
  if (!context) throw Error('Please supply a non-empty context');
  if (!context['@context']) throw Error('missing "@context" key in context');
  if (!context['@context']['@base']) throw Error('missing "@base" URL key in "@context"');
  return 'OK';
}

function transformRow(row, context, index, format) {
  return new Promise((resolve, reject) => {
    const formats = {
      'n-quads': 'application/nquads',
      nquads: 'application/nquads',
      jsonld: 'application/ld+json',
      'json-ld': 'application/ld+json'
    };
    const compacted = row;
    const subjectKey = context['@subject'];

    Object.keys(compacted).forEach(compactedKey => {
      if (compacted[compactedKey].toLowerCase() === 'null') {
        if (compactedKey === subjectKey) {
          //reject(new Error(`Unable to create rdf subject from NULL value on ${subjectKey} at row line ${index + 2}`));
          console.warn(`Unable to drop rdf subject NULL value on ${subjectKey} at row line ${index + 2}`);
        } else {
          delete compacted[compactedKey];
        }
      }
    });

    compacted['@context'] = context['@context'];
    compacted['@type'] = context['@type'];

    if (!compacted[subjectKey]) return reject(new Error(`There is no column ${subjectKey} in the table, see row: ${JSON.stringify(compacted)}`));
    compacted['@id'] = compacted[subjectKey];

    if (format === 'nquads' || format === 'n-quads') { // Aaahhhhh resort to duck-typing
      return jsonld.toRDF(compacted, { format: formats[format] }, (rdfErr, rdfSnippet) => {
        if (rdfErr) return reject(rdfErr);
        if (rdfSnippet === '') {
          return reject(new Error(`Unable to serialize rdf from data "${JSON.stringify(compacted, null, 2)}"`));
        }
        return resolve(rdfSnippet);
      });
    } else if (format === 'json-ld') {
      return resolve(JSON.stringify(compacted));
    }
  });
}

function transform(csvData, context, format) {
  return Promise.all(csvData.map((row, index) => transformRow(row, context, index, format)));
}

module.exports = { csvParse, csv2jsonSchema, checkKeys, checkContext, transform };
