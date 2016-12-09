'use strict';

const epsg = require('epsg');
const wellknown = require('wellknown');
const rprj = require('reproject');
const Promise = require('bluebird');

module.exports = function (wkt) {
  return new Promise((resolve, reject) => {
    const geojson = wellknown(wkt);
    if (!geojson) return reject(new Error(`Could not parse WKT ${wkt}`));

    const reprojectedGeojson = rprj.toWgs84(geojson, epsg['EPSG:28992'], epsg);
    return resolve(wellknown.stringify(reprojectedGeojson));
  });
};
