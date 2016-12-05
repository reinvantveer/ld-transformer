/**
 * Created by reinvantveer on 12/5/16.
 */
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
          required: [
            'column1',
            'column2'
          ],
          type: 'object'
        },
        type: 'array'
      }));
  });
  
  it('generates a hash of the schema', () => {
    return analyzer.createSchemaHash('test/mockups/test.csv')
      .then(hash => hash.should.deep.equal({
        file: 'test/mockups/test.csv',
        hash: 'e52f6e686d7d210e81416af42c98e975'
      }));
  });

  it('generates a hash of an identical file', () => {
    return analyzer.createSchemaHash('test/mockups/subfolder/test2.csv')
      .then(hash => hash.should.deep.equal({
        file: 'test/mockups/subfolder/test2.csv',
        hash: 'e52f6e686d7d210e81416af42c98e975'
      }));
  });

  it('summarizes the schemas of a particular folder and its subfolders', () => {
    return analyzer.analyzeFolderRecurse('test/mockups/', '.csv')
      .then(summary => {
        return summary.sort().should.deep.equal({
          'a066630197a8749359b068a90ee80fa3': {
            files: ['test/mockups/rd.csv']
          },
          'e52f6e686d7d210e81416af42c98e975': {
            files: ['test/mockups/test.csv', 'test/subfolder/test2.csv']
          }
        });
      });
  });
});