/**
 * Created by vagrant on 12/5/16.
 */
const csvReader = require('../lib/csvReader');
const chai = require('chai');

chai.should();

// MongoDb collections API stub
let collections = {
  fileCollection: {
    insertOne: () => Promise.resolve('OK')
  }
};

describe('The csv reader', () => {
  it('reads the test csv', () => {
    return csvReader.csvParse('test/mockups/test.csv', collections)
      .then(data => data.should.deep.equal([
        { column1: 'data1', column2: '1' },
        { column1: 'data3', column2: '2' }
      ]));
  });

  it('catches parse errors', () => {
    return csvReader.csvParse('test/mockups/faultyWKTtest/noWKT.wkt', collections)
      .should.be.rejectedWith(Error, 'Number of columns on line 2 does not match header');
  });

  it('catches datastore insert errors', () => {
    const reason = 'Generated error';
    collections.fileCollection.insertOne = () => Promise.reject(new Error(reason));
    return csvReader.csvParse('test/mockups/test.csv', collections)
      .should.be.rejectedWith(Error, reason);
  });

  it('catches parse errors and subsequent datastore insert errors', () => {
    const reason = 'Generated error';
    collections.fileCollection.insertOne = () => Promise.reject(new Error(reason));
    return csvReader.csvParse('test/mockups/faultyWKTtest/noWKT.wkt', collections)
      .should.be.rejectedWith(Error, reason);
  });
});
