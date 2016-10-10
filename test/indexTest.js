'use strict';
const transformer = require('../lib/transformer');

const chai = require('chai');
chai.should();

describe('The rdf transformer', function() {
  it('reads the test csv', () => {
    return transformer.csvParse('mockups/test.csv')
      .then(data => data.should.deep.equal([
        { column1: 'data1', column2: 'data2' },
        { column1: 'data3', column2: 'data4' }
      ]));
  });

  describe('context checker', () => {
    it('throws on a missing context key', () => {
      const testData = [{ column1: 'data1', column2: 'data2' }];
      (() => {
        transformer.checkKeys(testData, {});
      }).should.throw('Add {\n  "column1": "prefix:column1",\n  "column2": "prefix:column2"\n} to context file.');
    });

    it('accepts on described context keys', () => {
      const testData = [{ column1: 'data1', column2: 'data2' }];
      const context = {
        '@context': {
          column1: 'blah',
          column2: 'blah2'
        }
      };
      (() => {
        transformer.checkKeys(testData, context);
      }).should.not.throw();
    });

    it('throws on an empty context', () => {
      (() => {
        transformer.checkContext();
      }).should.throw('Please supply a non-empty context');
    });

    it('throws on a missing @context keyword', () => {
      const context = {
        '@subject': 'column1'
      };

      (() => {
        transformer.checkContext(context);
      }).should.throw('missing "@context" key in context');
    });

    it('throws on a missing @base keyword', () => {
      const context = {
        '@subject': 'column1',
        '@context': {
          column1: 'http://column1.org/',
          column2: 'http://column2.org/'
        }
      };

      (() => {
        transformer.checkContext(context);
      }).should.throw('@base" URL key in "@context');
    });

    it('accepts a full context', () => {
      const context = {
        '@subject': 'column1',
        '@context': {
          '@base': 'http://test.org/',
          column1: 'http://column1.org/',
          column2: 'http://column2.org/'
        }
      };

      (() => {
        transformer.checkContext(context);
      }).should.not.throw();
    });
  });

  it('transforms the test data', () => {
    const testData = [
      { column1: 'data1', column2: 'data2' },
      { column1: 'data3', column2: 'data4' }
    ];
    const context = {
      '@subject': 'column1',
      '@context': {
        '@base': 'http://testme/',
        column1: 'http://column1.org/',
        column2: 'http://column2.org/'
      }
    };

    return transformer.transform(testData, context)
      .then(rdf => rdf.join('').should.deep.equal(
        '<http://testme/data1> <http://column1.org/> "data1" .\n' +
          '<http://testme/data1> <http://column2.org/> "data2" .\n' +
        '<http://testme/data3> <http://column1.org/> "data3" .\n' +
          '<http://testme/data3> <http://column2.org/> "data4" .\n'
        ));
  });
});
