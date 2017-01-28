const transformer = require('../lib/transformer');
const chai = require('chai');

chai.should();

describe('The rdf transformer', () => {
  describe('plugin loader', () => {
    let plugins;

    it('loads the plugin from the dummy plugin folder', () => {
      try {
        plugins = transformer.loadPlugins(`${__dirname}/mockups/dummyPluginTest/`);
      } catch (e) {
        console.warn('error', e);
      }
      Object.keys(plugins).length.should.equal(1);
    });

    it('tests the plugins', () => {
      plugins.dummyPlugin(true).should.eventually.equal(true);
      return plugins.dummyPlugin(false).should.be.rejected;
    });

    it('rejects a plugin that is no thenable', () => {
      return (() => transformer.loadPlugins(`${__dirname}/mockups/noThenablePluginTest/`))
        .should.throw(Error, `Plugin ${__dirname}/mockups/noThenablePluginTest//faultyPlugin.js does not return a valid Promise.`);
    });

    it('catches errors on a plugin that throws errors', () => {
      return (() => transformer.loadPlugins(`${__dirname}/mockups/thenablePluginErrorTest/`))
        .should.throw(Error, `Plugin ${__dirname}/mockups/thenablePluginErrorTest//faultyPlugin.js does not return a valid Promise.`);
    });
  });

  describe('context checker', () => {
    it('throws on a missing context key', () => {
      const testData = [{ column1: 'data1', column2: 'data2' }];
      return (() => transformer.checkKeys(testData, {}))
        .should.throw('Add {\n  "column1": "prefix:column1",\n  "column2": "prefix:column2"\n} to context file.');
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
      return (() => transformer.checkContext())
        .should.throw('Please supply a non-empty context');
    });

    it('throws on a missing @context keyword', () => {
      const context = { '@subject': 'column1' };

      return (() => transformer.checkContext(context))
        .should.throw('missing "@context" key in context');
    });

    it('throws on a missing @subject keyword', () => {
      const context = {
        '@context': { '@base': 'http://nothing' }
      };

      return (() => {
        transformer.checkContext(context);
      }).should.throw('There is no "@subject" key in the context');
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
      }).should.throw('There is no "@base" URL key in "@context"');
    });

    it('throws on a missing @type keyword', () => {
      const context = {
        '@subject': 'column1',
        '@context': {
          '@base': 'dummy',
          column1: 'http://column1.org/',
          column2: 'http://column2.org/'
        }
      };

      (() => {
        transformer.checkContext(context);
      }).should.throw('There is no "@type" key in the context');
    });

    it('accepts a full context', () => {
      const context = {
        '@subject': 'column1',
        '@type': 'http://testtype/',
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

  describe('transform a single row', () => {
    it('catches errors on empty input', () => {
      const context = {
        '@preprocessors': [{ pluginName: 'faultyPlugin' }],
        '@subject': 'flip',
        '@type': 'http://test/flipsum',
        '@context': {
          '@base': 'http://testme/',
          flip: 'http://flip.org/'
        }
      };

      return transformer.transformRow({ flip: 'flop' }, context, 1, 'n-quads', {
        faultyPlugin: () => Promise.resolve()
      }).should.be.rejectedWith(Error, 'Unable to process empty input');
    });

    it('catches errors on faulty plugins', () => {
      const context = {
        '@preprocessors': [{
          pluginName: 'faultyPlugin',
          inputFields: ['flip']
        }],
        '@subject': 'flip',
        '@type': 'http://test/flipsum',
        '@context': {
          '@base': 'http://testme/',
          flip: 'http://flip.org/'
        }
      };

      const faultyPlugin = (inputfields) => {
        return Promise.reject(new Error('I am faulty'));
      };

      return transformer.transformRow({ flip: 'flop' }, context, 1, 'n-quads', {
        faultyPlugin
      }).should.be.rejectedWith(Error, 'I am faulty');
    });
  });

  describe('the transformer', () => {
    it('rejects empty data that should provide an rdf subject', () => {
      const testData = [
        { column1: 'data1', column2: 'data2' },
        { column2: 'data4' }
      ];
      const context = {
        '@subject': 'column1',
        '@type': 'http://test/testobject',
        '@context': {
          '@base': 'http://testme/',
          column1: 'http://column1.org/',
          column2: 'http://column2.org/'
        }
      };

      return transformer.transform(testData, context, 'n-quads')
        .should.be.rejectedWith(Error, 'There is no column column1 in the table');
    });

    it('rejects null data that should provide an rdf subject', () => {
      const testData = [
        { column1: 'data1', column2: 'data2' },
        { column1: null, column2: 'data4' }
      ];
      const context = {
        '@subject': 'column1',
        '@type': 'http://test/testobject',
        '@context': {
          '@base': 'http://testme/',
          column1: 'http://column1.org/',
          column2: 'http://column2.org/'
        }
      };

      return transformer.transform(testData, context, 'n-quads')
        .should.be.rejectedWith(Error, 'Unable to create rdf subject from null value');
    });

    it('rejects literal \'null\' data that should provide an rdf subject', () => {
      const testData = [
        { column1: 'data1', column2: 'data2' },
        { column1: 'NULL', column2: 'data4' }
      ];
      const context = {
        '@subject': 'column1',
        '@type': 'http://test/testobject',
        '@context': {
          '@base': 'http://testme/',
          column1: 'http://column1.org/',
          column2: 'http://column2.org/'
        }
      };

      return transformer.transform(testData, context, 'n-quads')
        .should.be.rejectedWith(Error, 'Unable to create rdf subject from null value');
    });

    it('transforms the test data', () => {
      const testData = [
        { column1: 'data1', column2: 'data2' },
        { column1: 'data3', column2: 'data4' }
      ];
      const context = {
        '@subject': 'column1',
        '@type': 'http://test/testobject',
        '@context': {
          '@base': 'http://testme/',
          column1: 'http://column1.org/',
          column2: 'http://column2.org/'
        }
      };

      return transformer.transform(testData, context, 'n-quads')
        .then(rdf => rdf.join('').should.deep.equal(
          '<http://testme/data1> <http://column1.org/> "data1" .\n' +
          '<http://testme/data1> <http://column2.org/> "data2" .\n' +
          '<http://testme/data1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://test/testobject> .\n' +
          '<http://testme/data3> <http://column1.org/> "data3" .\n' +
          '<http://testme/data3> <http://column2.org/> "data4" .\n' +
          '<http://testme/data3> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://test/testobject> .\n'
        ));
    });

    it('rejects an unknown serialization format', () => {
      const testData = [
        { column1: 'data1', column2: 'data2' },
        { column1: 'data3', column2: 'data4' }
      ];
      const context = {
        '@subject': 'column1',
        '@type': 'http://test/testobject',
        '@context': {
          '@base': 'http://testme/',
          column1: 'http://column1.org/',
          column2: 'http://column2.org/'
        }
      };

      return transformer.transform(testData, context, 'dummy')
        .should.be.rejectedWith(Error, 'unknown serialization format \'dummy\'');
    });

    it('serializes json-ld', () => {
      const testData = [
        { column1: 'data1', column2: 'data2' },
        { column1: 'data3', column2: 'data4' }
      ];
      const context = {
        '@subject': 'column1',
        '@type': 'http://test/testobject',
        '@context': {
          '@base': 'http://testme/',
          column1: 'http://column1.org/',
          column2: 'http://column2.org/'
        }
      };

      return transformer.transform(testData, context, 'json-ld')
        .then(rdf => rdf.join(',\n').should.deep.equal('{"column1":"data1","column2":"data2",' +
          '"@context":{"@base":"http://testme/","column1":"http://column1.org/","column2":"http://column2.org/"},' +
          '"@type":"http://test/testobject","@id":"data1"},\n' +
          '{"column1":"data3","column2":"data4",' +
          '"@context":{"@base":"http://testme/","column1":"http://column1.org/","column2":"http://column2.org/"},' +
          '"@type":"http://test/testobject","@id":"data3"}'
        ));
    });

    it('serializes jsonld', () => {
      const testData = [
        { column1: 'data1', column2: 'data2' },
        { column1: 'data3', column2: 'data4' }
      ];
      const context = {
        '@subject': 'column1',
        '@type': 'http://test/testobject',
        '@context': {
          '@base': 'http://testme/',
          column1: 'http://column1.org/',
          column2: 'http://column2.org/'
        }
      };

      return transformer.transform(testData, context, 'jsonld')
        .then(rdf => rdf.join(',\n').should.deep.equal('{"column1":"data1","column2":"data2",' +
          '"@context":{"@base":"http://testme/","column1":"http://column1.org/","column2":"http://column2.org/"},' +
          '"@type":"http://test/testobject","@id":"data1"},\n' +
          '{"column1":"data3","column2":"data4",' +
          '"@context":{"@base":"http://testme/","column1":"http://column1.org/","column2":"http://column2.org/"},' +
          '"@type":"http://test/testobject","@id":"data3"}'
        ));
    });
  });
});
