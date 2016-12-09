/**
 * Created by reinvantveer on 12/5/16.
 */

'use strict';

const file = require('file');
const GS = require('generate-schema');
const csvReader = require('./csvReader');
const crypto = require('crypto');
const _ = require('lodash');

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
          hash: crypto.createHash('md5').update(schemaJSON).digest('hex')
        });
      })
      .catch(err => reject(err));
  });
}

function dedupe(fileMaps) {
  const dedupedMaps = [];
  fileMaps.forEach(fileMap => {
    if (_.find(dedupedMaps, map => map.hash === fileMap.hash)) {
      const index = _.findIndex(dedupedMaps, obj => obj.hash === fileMap.hash);
      dedupedMaps[index].files.push(fileMap.files[0]);
    } else {
      dedupedMaps.push(fileMap);
    }
  });
  return dedupedMaps;
}
function analyzeFolderRecurse(folder, fileTypeExtension) {
  return new Promise((resolve, reject) => {
    const fileMap = [];

    file.walkSync(folder, (startDir, dirs, fileNames) => {
      const tailLength = fileTypeExtension.length;
      fileNames
        .filter(fileName => fileName.slice(-tailLength) === fileTypeExtension)
        .forEach(fileName => {
          console.log(startDir + '/' + fileName);
          let filePath = startDir + '/' + fileName;
          filePath = filePath.replace('//', '/');
          fileMap.push(createSchemaHash(filePath));
        });
    });

    Promise
      .all(fileMap)
      .then(fileMaps => resolve(dedupe(fileMaps)))
      .catch(reject);
  });
}

module.exports = { analyzeFolderRecurse, csv2jsonSchema, createSchemaHash };
