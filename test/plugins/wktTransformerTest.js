'use strict';

const fs = require('fs');
const wktTransformer = require('../../lib/plugins/wktTransformer');

const chai = require('chai');
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);
chai.should();

describe('The WKT transformer plugin', () => {
  it('reprojects a NL RD WKT multipolygon to WGS84', () => {
    const wktRD = fs.readFileSync(`${__dirname}/../mockups/wktRDexample.wkt`, 'utf-8');
    return wktTransformer(wktRD)
      .then(wktRD => wktRD.should.equal('MULTIPOLYGON (((4.034295343875342 51.44854718755686, 4.034301571120862 ' +
        '51.44854164747154, 4.0343067798823435 51.4485367814932, 4.034296345395528 51.44853192200852, ' +
        '4.034290307491091 51.44853699682265, 4.034284412169614 51.448542260276355, 4.034291151627362 51.4485453418964, ' +
        '4.034295343875342 51.44854718755686)), ((4.034296601946995 51.44853335974564, 4.03429394034026 ' +
        '51.44853563654858, 4.034286613869884 51.448542098820006, 4.034295032289078 51.448545907400934, ' +
        '4.0343012332699875 51.44854042814134, 4.0343033339204215 51.44853858263393, 4.034304796991972 ' +
        '51.448537132473646, 4.034296601946995 51.44853335974564)))'));
  });

  it('Catches errors on wkt parsing', () => {
    const faultyWKT = fs.readFileSync(`${__dirname}/../mockups/faultyWKTtest/noWKT.wkt`, 'utf-8');
    return wktTransformer(faultyWKT)
      .should.be.rejectedWith(Error, '1\n1,2,3');
  });
});
