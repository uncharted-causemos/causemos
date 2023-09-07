const _ = require('lodash');
const request = require('request');

const Logger = require('#@/config/logger.js');

/**
 * Execute request in a promise style
 *
 * @param {object} options - request option, need at a minimum url and method.
 */
const requestAsPromise = (options) => {
  return new Promise(function (resolve, reject) {
    if (_.isNil(options.url) || _.isNil(options.method)) {
      reject(new Error('Insufficient information to make request'));
    }

    Logger.info('Making ' + options.method + ' request to ' + options.url);

    // Timeout for external request
    if (!options.timeout) {
      options.timeout = 45000;
    }

    request(options, function (error, response, body) {
      if (!_.isNil(error)) {
        reject(error);
      } else if (_.isNil(response) || _.isNil(response.statusCode)) {
        reject(new Error('Non-existent or invalid response object'));
      } else if (response.statusCode < 200 || response.statusCode > 299) {
        Logger.error(response.body);
        reject(new Error('Unexpected status code ' + response.statusCode));
      } else {
        resolve(body);
      }
    });
  });
};

module.exports = requestAsPromise;
