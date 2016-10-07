'use strict';

const csv = require('csv');
const fs = require('fs');
const jsonld = require('jsonld');

const context = require('./data/context.json');

csv.parse(fs.readFileSync('data/GCB_DISK.xlsx - Blad1.csv'), { columns: true }, (parseErr, disk) => {
  if (parseErr) throw parseErr;

  const missingKeys = [];

  Object.keys(disk[0]).forEach(key => {
    if (!context['@context'][key]) {
      console.error(`Key '${key}' not present in context file.`);
      missingKeys.push(key);
    }
  });

  const bootstrapContext = {};
  missingKeys
    .forEach(missingKey => bootstrapContext[missingKey] = 'rws:' + missingKey);
  if (missingKeys === []) throw Error(`Add ${JSON.stringify(bootstrapContext, null, 2)} to context file.`);

  disk.forEach(row => {
    const compacted = row;
    Object.keys(compacted).forEach(compactedKey => {
      if (compacted[compactedKey] === 'NULL') delete compacted[compactedKey];
    });

    compacted['@context'] = context['@context'];

    const subjectKey = context['@subject'];
    if (!compacted[subjectKey]) throw Error(`There is no column ${subjectKey} in the table`);
    compacted['@id'] = compacted[subjectKey];
    // throw JSON.stringify(compacted, null, 2);

    jsonld.toRDF(compacted, { format: 'application/nquads' }, (rdfErr, rdf) => {
      if (rdfErr) throw rdfErr;
      fs.appendFileSync('./data/disk.nq', rdf);
    });
  });
});
