/**
 * Created by vagrant on 12/5/16.
 */
const csv = require('csv');
const fs = require('fs');

function csvParse(filePath) {
  return new Promise((resolve, reject) => {
    csv.parse(fs.readFileSync(filePath), { columns: true }, (parseErr, csvData) => {
      if (parseErr) {
        console.error(`Error parsing file ${filePath}`);
        return reject(parseErr);
      }
      return resolve(csvData);
    });
  });
}

module.exports = { csvParse };