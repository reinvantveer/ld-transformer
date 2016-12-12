'use strict';

const epsg = require('epsg');
const wellknown = require('wellknown');
const rprj = require('reproject');
const Promise = require('bluebird');

module.exports = function (inputArray) {
  return new Promise((resolve, reject) => {
    const geojson = wellknown(inputArray[0]);
    if (!geojson) return reject(new Error(`Could not parse WKT ${inputArray[0]}`));

    const reprojectedGeojson = rprj.toWgs84(geojson, epsg['EPSG:28992'], epsg);
    return resolve(wellknown.stringify(reprojectedGeojson));
  });
};
