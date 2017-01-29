/**
 * Created by reinvantveer on 12/5/16.
 */

'use strict';

const file = require('file');
const GS = require('generate-schema');
const csvReader = require('./csvReader');
const crypto = require('crypto');
const xtend = require('xtend');
const _ = require('lodash');
const H = require('highland');
const jsonpatch = require('fast-json-patch');

function csv2jsonSchema(filePath, collections) {
  let schema;

  return csvReader.csvParse(filePath, collections)
    .then(csvData => {
      schema = GS.json(csvData);
      delete schema.items.required;

      const rows = csvData.map(row => xtend(row, { filePath }))
        .map(row => xtend(row, {
          _id: crypto.createHash('md5')
            .update(JSON.stringify(row))
            .digest('hex')
        }));

      return Promise.all(
        rows.map(row => {
          return collections.sourcedataCollection.updateOne(
            { _id: row._id },
            { $set: row },
            { upsert: true }
          );
        }));
    })
    .then(() => schema)
    .catch(err => {
      console.error(`Error on ${filePath}`);
      throw err;
    });
}

function createSchemaHash(filePath, collections) {
  return new Promise((resolve, reject) => {
    csv2jsonSchema(filePath, collections)
      .then(schema => {
        const schemaJSON = JSON.stringify(schema);
        return resolve({
          files: [filePath],
          hash: crypto.createHash('md5')
            .update(schemaJSON)
            .digest('hex'),
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

function schemaDiffSorter(diffA, diffB) {
  if (diffA.patch.length > diffB.patch.length) {
    // Only prefer shorter-length diffB if it does something constructive, by adding something somewhere
    if (diffB.patch.findIndex(patchOp => patchOp.op === 'add') >= 0) return 1;
    return -1;
  }
  if (diffA.patch.length < diffB.patch.length) {
    // Only prefer shorter-length diffA if it does something constructive
    if (diffA.patch.findIndex(patchOp => patchOp.op === 'add') >= 0) return -1;
    return 1;
  }
  if (diffA.patch.findIndex(element => element.op === 'remove') >= 0 && diffB.patch.findIndex(element => element.op === 'remove') === -1) return 1;
  if (diffA.patch.findIndex(element => element.op === 'remove') === -1 && diffB.patch.findIndex(element => element.op === 'remove') >= 0) return -1;
  return 0;
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
            };
          })
          .sort(schemaDiffSorter);
        relateSchema.closestRelatives = diffs[0] ? [diffs[0]] : [];
        return relateSchema;
      });
    return resolve(relatedMap);
  });
}

function toD3Graph(relatedMap) {
  return new Promise((resolve, reject) => {
    const graph = {
      nodes: relatedMap.map(schema => {
        return {
          hash: schema.hash,
          occurrences: schema.occurrences
        };
      }),
      edges: relatedMap.map(schema => {
        return {
          source: schema.hash,
          target: schema.closestRelatives[0].schemaHash
        };
      })
    };
    return resolve(graph);
  });
}

function toXDotGraph(relatedMap) {
  return new Promise((resolve, reject) => {
    let graph = 'digraph g {\n';
    relatedMap.forEach(schema => {
      graph += `\t"${schema.hash}" -> "${schema.closestRelatives[0].schemaHash}";\n`;
    });
    graph += '}';

    return resolve(graph);
  });
}

function analyzeFolderRecursive(folder, fileTypeExtension, mongodb) {
  return new Promise((resolve, reject) => {
    const fileMap = [];

    const collections = {
      schemaCollection: mongodb.collection('schemas'),
      fileCollection: mongodb.collection('files'),
      sourcedataCollection: mongodb.collection('sourcedata')
    };

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

    console.log(fileMap.length + ' files for analysis.');

    H(fileMap)
      .map(filePath => H(createSchemaHash(filePath, collections)))
      .parallel(4)
      .errors(err => console.error(err))
      .toArray(hashes => {
        relate(summarize(hashes))
          .then(resolve);
      });
  });
}

module.exports = { analyzeFolderRecursive, csv2jsonSchema, createSchemaHash, schemaDiffSorter, toD3Graph, toXDotGraph };
