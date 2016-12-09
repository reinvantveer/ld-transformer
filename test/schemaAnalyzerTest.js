/**
 * Created by reinvantveer on 12/5/16.
 */

'use strict';

const analyzer = require('../lib/schemaAnalyzer');
const chai = require('chai');

chai.should();

describe('The schema analyzer', () => {
  it('generates a json schema for the csv', () => {
    return analyzer.csv2jsonSchema('test/mockups/test.csv')
      .then(schema => schema.should.deep.equal({
        $schema: 'http://json-schema.org/draft-04/schema#',
        items: {
          properties: {
            column1: {
              type: 'string'
            },
            column2: {
              type: 'string'
            }
          },
          type: 'object'
        },
        type: 'array'
      }));
  });

  it('generates a hash of the schema', () => {
    return analyzer.createSchemaHash('test/mockups/test.csv')
      .then(hash => hash.should.deep.equal({
        files: ['test/mockups/test.csv'],
        hash: 'ece9e8a91157824de7c5a9527c322ea9'
      }));
  });

  it('generates a hash of an identical file', () => {
    return analyzer.createSchemaHash('test/mockups/subfoldertest/subfolder/test2.csv')
      .then(hash => hash.should.deep.equal({
        files: ['test/mockups/subfoldertest/subfolder/test2.csv'],
        hash: 'ece9e8a91157824de7c5a9527c322ea9'
      }));
  });

  it('summarizes the schemas of a particular folder and its subfolders', () => {
    return analyzer.analyzeFolderRecurse('test/mockups/subfoldertest/', '.csv')
      .then(summary => {
        return summary.sort().should.deep.equal([
          {
            hash: 'a066630197a8749359b068a90ee80fa3',
            files: ['test/mockups/subfoldertest/rd.csv']
          },
          {
            hash: 'ece9e8a91157824de7c5a9527c322ea9',
            files: ['test/mockups/subfoldertest/test.csv', 'test/mockups/subfoldertest/subfolder/test2.csv']
          }
        ]);
      });
  });

  it('creates identical schemas for two files, one file missing one value', () => {
    return analyzer.analyzeFolderRecurse('test/mockups/sameSchemaTest', '.csv')
      .then(result => result.sort().should.deep.equal([
        {
          files: [
            'test/mockups/sameSchemaTest/test.csv',
            'test/mockups/sameSchemaTest/test2.csv'
          ],
          hash: 'ece9e8a91157824de7c5a9527c322ea9'
        }
      ]));
  });
});
