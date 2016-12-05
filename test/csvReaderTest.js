/**
 * Created by vagrant on 12/5/16.
 */
const chai = require('chai');
chai.should();

const csvReader = require('../lib/csvReader');

describe('The csv reader', () => {
  it('reads the test csv', () => {
    return csvReader.csvParse('test/mockups/test.csv')
      .then(data => data.should.deep.equal([
        { column1: 'data1', column2: 'data2' },
        { column1: 'data3', column2: 'data4' }
      ]));
  });
});