/**
 * Created by vagrant on 12/5/16.
 */
'use strict';
const fs = require('fs');
const file = require('file');
const GS = require('generate-schema');
const csvReader = require('./csvReader');
const crypto = require('crypto');

function csv2jsonSchema(filePath) {
  return csvReader.csvParse(filePath)
    .then(csvData => GS.json(csvData))
    .catch(err => { throw err; });
}

function createSchemaHash(filePath) {
  return new Promise((resolve, reject) => {
    csv2jsonSchema(filePath)
      .then(schema => {
        const schemaJSON = JSON.stringify(schema);
        return resolve({
          file: filePath,
          hash: crypto.createHash('md5').update(schemaJSON).digest('hex')
        });
      })
      .catch(err => reject(err));
  });
}

function analyzeFolderRecurse(folder, fileTypeExtension) {
  const fileMap = [];
  file.walkSync(folder, (start, dirs, fileNames) => {
    const tail = fileTypeExtension.length;
    fileNames
      .filter(fileName => fileName.slice(-tail) === fileTypeExtension)
      .forEach(fileName => {
        console.log(start + '/' + fileName);
        fileMap.push(createSchemaHash(start + '/' + fileName));
      });
  });
  return Promise.all(fileMap);
}

module.exports = {analyzeFolderRecurse, csv2jsonSchema, createSchemaHash};