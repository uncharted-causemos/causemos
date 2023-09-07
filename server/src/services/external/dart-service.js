const moment = require('moment');
const request = require('request');
const requestAsPromise = require('#@/util/request-as-promise.js');
const auth = require('#@/util/auth-util.js');
const Logger = require('#@/config/logger.js');

const basicAuthToken = auth.getBasicAuthToken(
  process.env.DART_SERVICE_USERNAME,
  process.env.DART_SERVICE_PASSWORD
);

const DART_SERVICE_URL =
  'https://wm-ingest-pipeline-rest-1.prod.dart.worldmodelers.com/dart/api/v1';
const DART_READER_URL =
  'https://wm-ingest-pipeline-rest-1.prod.dart.worldmodelers.com/dart/api/v1/readers';

const TIMEOUT = 3 * 1000;

/** Ontology from DART
 *
 *   {
 *     "id": {UUID},
 *     "tenant_id": {String},
 *     "version": {Int},
 *     "staging_version": {Int},
 *     "ontology": {String (this is the yml contents)},
 *     "tags": {Array of String},
 *     "timestamp": {Double}
 *   }
 */
const getOntologyById = async (id) => {
  Logger.info(`Calling ${DART_SERVICE_URL}/ontologies`);
  const options = {
    url: `${DART_SERVICE_URL}/ontologies?id=${id}`,
    method: 'GET',
    headers: {
      Authorization: basicAuthToken,
    },
    json: {},
    timeout: TIMEOUT,
  };
  const result = await requestAsPromise(options);
  return result;
};

/**
 * Returns the ontology yaml string
 */
const getOntologyByTenant = async (tenantId) => {
  Logger.info(`Calling ${DART_SERVICE_URL}/ontologies`);
  const options = {
    url: `${DART_SERVICE_URL}/ontologies?tenant=${tenantId}`,
    method: 'GET',
    headers: {
      Authorization: basicAuthToken,
    },
    json: {},
    timeout: TIMEOUT,
  };
  const result = await requestAsPromise(options);
  return result;
};

/**
 * Returns the stream of the raw document of document with corresponding id
 * @param {string} docId
 */
const getRawDoc = async (docId) => {
  Logger.info(`Calling ${DART_SERVICE_URL}/cdrs/raw/${docId}`);
  const options = {
    url: `${DART_SERVICE_URL}/cdrs/raw/${docId}`,
    // url: `${process.env.DART_DOCUMENT_RETRIEVAL_URL}/${docId}`,
    method: 'GET',
    headers: {
      Authorization: basicAuthToken,
    },
    timeout: TIMEOUT,
  };
  return request(options);
};

/**
 * Sends a file to the DART server for parsing and returns document meta text.
 */
const uploadDocument = async (fileToUpload, metadata = {}) => {
  const formData = {
    file: {
      value: fileToUpload.buffer,
      options: {
        filename: fileToUpload.originalname,
        contentType: fileToUpload.mimeType,
      },
    },
    metadata: metadata,
  };

  const options = {
    url: DART_SERVICE_URL + '/forklift/upload',
    method: 'POST',
    headers: {
      Authorization: basicAuthToken,
      'Content-type': 'application/json',
    },
    formData: formData,
  };
  const result = await requestAsPromise(options);
  return result;
};

/**
 * List out reader status after a given timestamp
 */
const queryReadersStatus = async (timestamp) => {
  // Format timestamp to yyyy-mm-dd hh:mm:ss
  const t = moment.utc(+timestamp).format('YYYY-MM-DDTHH:mm:ss');

  const formData = {
    metadata: JSON.stringify({
      timestamp: {
        after: t,
      },
    }),
  };

  Logger.info('Sending to DART ' + JSON.stringify(formData));

  const options = {
    url: `${DART_READER_URL}/query`,
    method: 'POST',
    headers: {
      Authorization: basicAuthToken,
      'Content-type': 'application/json',
    },
    formData: formData,
    timeout: TIMEOUT,
  };
  const result = await requestAsPromise(options);
  return result;
};

module.exports = {
  getOntologyById,
  getOntologyByTenant,
  getRawDoc,
  uploadDocument,
  queryReadersStatus,
};
