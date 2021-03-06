/**
 * Created by reinvantveer on 12/5/16.
 */

'use strict';

const analyzer = require('../lib/schemaAnalyzer');
const chai = require('chai');

chai.should();

// MongoDb collections API stub
const collections = {
  fileCollection: { insertOne: dummy => {
    return dummy === 'error' ? Promise.reject('Test error') : Promise.resolve('OK')
  } },
  files: { insertOne: dummy => {
    return dummy === 'error' ? Promise.reject('Test error') : Promise.resolve('OK')
  } },
  sourcedataCollection: { insertMany: () => Promise.resolve('OK') },
  sourcedata: { insertMany: () => Promise.resolve('OK') }
};

let mongodb;

describe('The schema analyzer', () => {
  before(() => {
    mongodb = { collection: collection => collections[collection] };
  });

  describe('schema generator', () => {
    it('generates a json schema for the csv', () => {
      return analyzer.csv2jsonSchema('test/mockups/test.csv', collections)
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

    it('creates identical schemas for two files, one file missing one row value', () => {
      return analyzer.analyzeFolderRecursive('test/mockups/sameSchemaTest', '.csv', mongodb)
        .then(result => result.sort().should.deep.equal([
          {
            files: [
              'test/mockups/sameSchemaTest/test.csv',
              'test/mockups/sameSchemaTest/test2.csv'
            ],
            hash: 'ece9e8a91157824de7c5a9527c322ea9',
            closestRelatives: [],
            occurrences: 2,
            schema: {
              $schema: 'http://json-schema.org/draft-04/schema#',
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  column1: { type: 'string' },
                  column2: { type: 'string' }
                }
              }
            }
          }
        ]));
    });
  });

  describe('file hashing', () => {
    it('generates a hash of the schema', () => {
      return analyzer.createSchemaHash('test/mockups/test.csv', collections)
        .then(hash => hash.should.deep.equal({
          files: ['test/mockups/test.csv'],
          hash: 'ece9e8a91157824de7c5a9527c322ea9',
          schema: {
            $schema: 'http://json-schema.org/draft-04/schema#',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                column1: { type: 'string' },
                column2: { type: 'string' }
              }
            }
          }
        }));
    });

    it('generates a hash of an identical file', () => {
      return analyzer.createSchemaHash('test/mockups/subfoldertest/subfolder/test2.csv', collections)
        .then(hash => hash.should.deep.equal({
          files: ['test/mockups/subfoldertest/subfolder/test2.csv'],
          hash: 'ece9e8a91157824de7c5a9527c322ea9',
          schema: {
            $schema: 'http://json-schema.org/draft-04/schema#',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                column1: { type: 'string' },
                column2: { type: 'string' }
              }
            }
          }
        }));
    });

    it('rejects hashing of a non-existing file', () => {
      return analyzer.createSchemaHash('nonexist', collections)
        .should.be.rejectedWith(Error, 'ENOENT: no such file or directory');
    });
  });

  describe('schema analysis', () => {
    it('summarizes the schemas of a particular folder and its subfolders', () => {
      return analyzer.analyzeFolderRecursive('test/mockups/subfoldertest/', 'csv', mongodb)
        .then(summary => {
          return summary.sort().should.deep.equal([
            {
              hash: 'ef4e1166fc061ac5c3ce0ee63ec4f518',
              files: ['test/mockups/subfoldertest/rd.csv'],
              closestRelatives: [{
                schemaHash: 'ece9e8a91157824de7c5a9527c322ea9',
                patch: [
                  { op: 'remove', path: '/items/properties/column2' },
                  { op: 'remove', path: '/items/properties/column1' },
                  { op: 'add', path: '/items/properties/bang', value: { type: 'string' } }
                ]
              }],
              occurrences: 1,
              schema: {
                $schema: 'http://json-schema.org/draft-04/schema#',
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    bang: { type: 'string' }
                  }
                }
              }
            },
            {
              hash: 'ece9e8a91157824de7c5a9527c322ea9',
              files: ['test/mockups/subfoldertest/test.csv', 'test/mockups/subfoldertest/subfolder/test2.csv'],
              closestRelatives: [{
                schemaHash: 'ef4e1166fc061ac5c3ce0ee63ec4f518',
                patch: [
                  { op: 'remove', path: '/items/properties/bang' },
                  { op: 'add', path: '/items/properties/column1', value: { type: 'string' } },
                  { op: 'add', path: '/items/properties/column2', value: { type: 'string' } }
                ],
              }],
              occurrences: 2,
              schema: {
                $schema: 'http://json-schema.org/draft-04/schema#',
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    column1: { type: 'string' },
                    column2: { type: 'string' }
                  }
                }
              }
            }
          ]);
        });
    });

    it('creates a d3 graph data set', () => {
      return analyzer.analyzeFolderRecursive('test/mockups/subfoldertest/', 'csv', mongodb)
        .then(summary => analyzer.toD3Graph(summary))
        .then(graph => graph.should.deep.equal({
          nodes: [
            { hash: 'ef4e1166fc061ac5c3ce0ee63ec4f518', occurrences: 1 },
            { hash: 'ece9e8a91157824de7c5a9527c322ea9', occurrences: 2 }
          ],
          edges: [
            { source: 'ef4e1166fc061ac5c3ce0ee63ec4f518', target: 'ece9e8a91157824de7c5a9527c322ea9' },
            { source: 'ece9e8a91157824de7c5a9527c322ea9', target: 'ef4e1166fc061ac5c3ce0ee63ec4f518' }
          ]
        }));
    });

    it('creates a dot graph data set', () => {
      return analyzer.analyzeFolderRecursive('test/mockups/subfoldertest/', 'csv', mongodb)
        .then(summary => analyzer.toXDotGraph(summary))
        .then(graph => graph.should.deep.equal(
          'digraph g {\n' +
          '\t"ef4e1166fc061ac5c3ce0ee63ec4f518" -> "ece9e8a91157824de7c5a9527c322ea9";\n' +
          '\t"ece9e8a91157824de7c5a9527c322ea9" -> "ef4e1166fc061ac5c3ce0ee63ec4f518";\n' +
          '}'
        ));
    });

    describe('schema diff sorter', () => {
      it('prefers few diffs over many diffs', () => {
        const diffA = {
          patch: [
            { op: 'remove', path: '/items/properties/bang' },
            { op: 'add', path: '/items/properties/column1', value: { type: 'string' } },
            { op: 'add', path: '/items/properties/column2', value: { type: 'string' } }
          ]
        };

        const diffB = {
          patch: [
            { op: 'remove', path: '/items/properties/bang' },
            { op: 'add', path: '/items/properties/column1', value: { type: 'string' } }
          ]
        };

        return analyzer.schemaDiffSorter(diffA, diffB)
          .should.equal(1);
      });

      it('prefers few diffs over many diffs', () => {
        const diffA = {
          patch: [
            { op: 'remove', path: '/items/properties/bang' },
            { op: 'add', path: '/items/properties/column1', value: { type: 'string' } }
          ]
        };

        const diffB = {
          patch: [
            { op: 'remove', path: '/items/properties/bang' },
            { op: 'add', path: '/items/properties/column1', value: { type: 'string' } },
            { op: 'add', path: '/items/properties/column2', value: { type: 'string' } }
          ]
        };

        return analyzer.schemaDiffSorter(diffA, diffB)
          .should.equal(-1);
      });

      it('prefers add diffs over replace diffs', () => {
        const diffA = {
          patch: [
            { op: 'add', path: '/items/properties/column1', value: { type: 'string' } },
            { op: 'add', path: '/items/properties/column2', value: { type: 'string' } }
          ]
        };

        const diffB = {
          patch: [
            { op: 'remove', path: '/items/properties/bang' },
            { op: 'add', path: '/items/properties/column1', value: { type: 'string' } }
          ]
        };

        return analyzer.schemaDiffSorter(diffA, diffB)
          .should.equal(-1);
      });

      it('prefers add diffs over replace diffs', () => {
        const diffA = {
          patch: [
            { op: 'remove', path: '/items/properties/bang' },
            { op: 'add', path: '/items/properties/column1', value: { type: 'string' } }
          ]
        };

        const diffB = {
          patch: [
            { op: 'add', path: '/items/properties/column1', value: { type: 'string' } },
            { op: 'add', path: '/items/properties/column2', value: { type: 'string' } }
          ]
        };

        return analyzer.schemaDiffSorter(diffA, diffB)
          .should.equal(1);
      });

      it('prefers an remove and add diff over just a remove diff', () => {
        const diffA = {
          patch: [
            { op: 'remove', path: '/items/properties/bang' },
          ]
        };

        const diffB = {
          patch: [
            { op: 'remove', path: '/items/properties/column1', value: { type: 'string' } },
            { op: 'add', path: '/items/properties/column2', value: { type: 'string' } }
          ]
        };

        return analyzer.schemaDiffSorter(diffA, diffB)
          .should.equal(1);
      });

      it('prefers an remove and add diff over just a remove diff', () => {
        const diffA = {
          patch: [
            { op: 'remove', path: '/items/properties/column1', value: { type: 'string' } },
            { op: 'remove', path: '/items/properties/column2', value: { type: 'string' } },
            { op: 'add', path: '/items/properties/column2', value: { type: 'string' } }
          ]
        };

        const diffB = {
          patch: [
            { op: 'remove', path: '/items/properties/bang' },
          ]
        };

        return analyzer.schemaDiffSorter(diffA, diffB)
          .should.equal(-1);
      });
    });
  });
});
