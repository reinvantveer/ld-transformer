/**
 * Created by vagrant on 12/5/16.
 */

'use strict';

const csv = require('csv');
const fs = require('fs');
const crypto = require('crypto');
const upsertMany = require('./mongoWriter').upsertMany;

function csvParse(filePath, collections) {
  return new Promise((resolve, reject) => {
    const fileStats = fs.statSync(filePath);
    const fileData = fs.readFileSync(filePath);

    fileStats.filePath = filePath;
    fileStats.hash = crypto.createHash('md5')
      .update(fileData)
      .digest('hex');
    fileStats._id = filePath;

    csv.parse(fileData, { columns: true }, (parseErr, csvData) => {
      if (parseErr) {
        console.error(`Error parsing file ${filePath}`);
        fileStats.error = parseErr;
        return upsertMany([fileStats], collections.fileCollection)
          .then(() => reject(parseErr))
          .catch(err => reject(err));
      }

      return upsertMany([fileStats], collections.fileCollection)
        .then(() => resolve(csvData))
        .catch(err => reject(err));
    });
  });
}

module.exports = { csvParse };
