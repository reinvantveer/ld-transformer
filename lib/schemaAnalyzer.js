/**
 * Created by reinvantveer on 12/5/16.
 */

'use strict';

const file = require('file');
const GS = require('generate-schema');
const csvReader = require('./csvReader');
const crypto = require('crypto');
const _ = require('lodash');
const H = require('highland');
const jsonpatch = require('fast-json-patch');

function guessDelimiters(text, possibleDelimiters) {
  function weedOut(delimiter) {
    let cache = -1;
    function checkLength(line) {
      if (!line) return true;
      const length = line.split(delimiter).length;
      if (cache < 0) cache = length;
      return cache === length && length > 1;
    }
    return text.split('\n').every(checkLength);
  }
  return possibleDelimiters.filter(weedOut);
}

function csv2jsonSchema(filePath) {
  return csvReader.csvParse(filePath)
    .then(csvData => {
      const schema = GS.json(csvData);
      delete schema.items.required;
      return schema;
    })
    .catch(err => { throw err; });
}

function createSchemaHash(filePath) {
  return new Promise((resolve, reject) => {
    csv2jsonSchema(filePath)
      .then(schema => {
        const schemaJSON = JSON.stringify(schema);
        return resolve({
          files: [filePath],
          hash: crypto.createHash('md5').update(schemaJSON).digest('hex'),
          schema
        });
      })
      .catch(err => reject(err));
  });
}

function summarize(fileMaps) {
  const dedupedMaps = [];
  fileMaps.forEach(fileMap => {
    if (_.find(dedupedMaps, map => map.hash === fileMap.hash)) {
      const index = _.findIndex(dedupedMaps, obj => obj.hash === fileMap.hash);
      dedupedMaps[index].files.push(fileMap.files[0]);
      dedupedMaps[index].occurrences = dedupedMaps[index].files.length;
    } else {
      fileMap.occurrences = 1;
      dedupedMaps.push(fileMap);
    }
  });
  return dedupedMaps;
}

function relate(dedupedMap) {
  return new Promise((resolve, reject) => {
    const relatedMap = dedupedMap
      .map(relateSchema => {
        const diffs = dedupedMap
          .filter(refSchema => refSchema.schema !== relateSchema.schema)
          .map(compareSchema => {
            return {
              schemaHash: compareSchema.hash,
              patch: jsonpatch.compare(compareSchema.schema, relateSchema.schema)
            }
          })
          .sort((diffA, diffB) => {
            if (diffA.length > diffB.length) return 1;
            if (diffA.length < diffB.length) return -1;
            return 0;
          });
        relateSchema.closestRelatives = diffs[0] ? [diffs[0]] : [];
        return relateSchema;
      });
    return resolve(relatedMap);
  });
}

function analyzeFolderRecursive(folder, fileTypeExtension) {
  return new Promise((resolve, reject) => {
    const fileMap = [];

    // TODO: test for folder existence
    file.walkSync(folder, (startDir, dirs, fileNames) => {
      const extensionLength = fileTypeExtension.length;
      fileNames
        .filter(fileName => fileName.slice(-extensionLength) === fileTypeExtension)
        .forEach(fileName => {
          console.log(startDir + '/' + fileName);
          let filePath = startDir + '/' + fileName;
          filePath = filePath.replace('//', '/');
          fileMap.push(filePath);
        });
    });

    H(fileMap)
      .map(filePath => H(createSchemaHash(filePath)))
      .parallel(4)
      .errors(err => console.error(err))
      .toArray(hashes => {
        relate(summarize(hashes))
          .then(resolve);
      });
  });
}

module.exports = { analyzeFolderRecursive, csv2jsonSchema, createSchemaHash, relate };
