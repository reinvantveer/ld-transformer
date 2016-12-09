'use strict';

module.exports = (somevar) => {
  return new Promise((resolve, reject) => somevar ? resolve(true) : reject(false));
};
