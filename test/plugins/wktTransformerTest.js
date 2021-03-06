'use strict';

const fs = require('fs');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
chai.should();

const wktTransformer = require('../../lib/plugins/wktTransformer');
const transformer = require('../../lib/transformer');

describe('The WKT transformer plugin', () => {
  it('reprojects a NL RD WKT multipolygon to WGS84', () => {
    const wktRD = fs.readFileSync(`${__dirname}/../mockups/wktRDexample.wkt`, 'utf-8');
    return wktTransformer([wktRD])
      .then(wktWGS84 => wktWGS84.should.equal('MULTIPOLYGON (((4.034295343875342 51.44854718755686, 4.034301571120862 ' +
        '51.44854164747154, 4.0343067798823435 51.4485367814932, 4.034296345395528 51.44853192200852, ' +
        '4.034290307491091 51.44853699682265, 4.034284412169614 51.448542260276355, 4.034291151627362 51.4485453418964, ' +
        '4.034295343875342 51.44854718755686)), ((4.034296601946995 51.44853335974564, 4.03429394034026 ' +
        '51.44853563654858, 4.034286613869884 51.448542098820006, 4.034295032289078 51.448545907400934, ' +
        '4.0343012332699875 51.44854042814134, 4.0343033339204215 51.44853858263393, 4.034304796991972 ' +
        '51.448537132473646, 4.034296601946995 51.44853335974564)))'));
  });

  it('reprojects a NL RD WKT multipolygon with a hole to WGS84', () => {
    const wktRD = fs.readFileSync(`${__dirname}/../mockups/wktTest/multiPolygonHole.wkt`, 'utf-8');
    return wktTransformer([wktRD])
      .then(wktWGS84 => wktWGS84.should.equal('MULTIPOLYGON (((5.754428049334684 52.261383955423376, 5.740914697685268 ' +
        '52.28339253643944, 5.765932337108908 52.31400453475216, 5.86984489660721 52.32073301342982, 5.896760473235345 ' +
        '52.27733132929143, 5.826926423933702 52.24562981264338, 5.754428049334684 52.261383955423376), ' +
        '(5.801367472012636 52.27027409549349, 5.774070226060119 52.2800581317804, 5.779493903911994 52.29780792445786, ' +
        '5.814898394324465 52.308345695216744, 5.856498516623215 52.304957361489, 5.8668880030868875 52.29102451460725, ' +
        '5.8413930601113 52.27077308572321, 5.801367472012636 52.27027409549349)), ((5.817325634225709 ' +
        '52.341287693057126, 5.829360076736527 52.384531327926034, 5.886983479155143 52.391408991603925, ' +
        '5.955794591237556 52.363316426979765, 5.880531711587841 52.333610832902245, 5.817325634225709 ' +
        '52.341287693057126)))'));
  });

  it('Catches errors on wkt parsing', () => {
    const faultyWKT = fs.readFileSync(`${__dirname}/../mockups/faultyWKTtest/noWKT.wkt`, 'utf-8');
    return wktTransformer([faultyWKT])
      .should.be.rejectedWith(Error, '1\n1,2,3');
  });

  describe('integrates with the transformer', () => {
    it('transforms a test json to WGS84', () => {
      const plugins = {
        wktTransformer: transformer.loadPlugin(`${__dirname}/../../lib/plugins/wktTransformer.js`)
      };

      const csvData = {
        WKT: 'POINT(15500 350000)',
        data: 'dummy'
      };

      const context = {
        '@preprocessors': [{
          pluginName: 'wktTransformer',
          inputFields: ['WKT'],
          outputField: 'WKT',
          arguments: []
        }],
        '@context': {
          '@base': 'http://wkttest/'
        },
        '@subject': 'data',
        '@type': 'http://wkttesttype/'
      };

      (() => transformer.checkContext(context)).should.not.Throw();

      return transformer.transformRow(csvData, context, 1, 'json-ld', plugins)
        .then(result => result.should.deep.equal(JSON.stringify({
          WKT: 'POINT (3.3945230087679517 51.12237737779467)',
          data: 'dummy',
          '@context': { '@base': 'http://wkttest/' },
          '@type': 'http://wkttesttype/',
          '@id': 'dummy'
        })));
    });
  });
});
