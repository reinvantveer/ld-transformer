/**
 * Created by vagrant on 12/5/16.
 */

'use strict';

const csv = require('csv');
const fs = require('fs');
const xtend = require('xtend');

function csvParse(filePath, collections) {
  return new Promise((resolve, reject) => {
    const fileStats = fs.statSync(filePath);
    fileStats.filePath = filePath;

    csv.parse(fs.readFileSync(filePath), { columns: true }, (parseErr, csvData) => {
      if (parseErr) {
        console.error(`Error parsing file ${filePath}`);
        fileStats.error = parseErr;
        return collections.fileCollection.insertOne(xtend(fileStats, { _id: filePath }))
          .then(() => reject(parseErr))
          .catch(err => reject(err));
      }

      return collections.fileCollection.insertOne(xtend(fileStats, { _id: filePath }))
        .then(() => resolve(csvData))
        .catch(err => reject(err));
    });
  });
}

module.exports = { csvParse };
