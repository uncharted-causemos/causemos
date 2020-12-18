const request = require('request');
const requestAsPromise = rootRequire('/util/request-as-promise');
const auth = rootRequire('/util/auth-util');

const basicAuthToken = auth.getBasicAuthToken(process.env.DART_SERVICE_USERNAME, process.env.DART_SERVICE_PASSWORD);

/**
 * Returns the stream of the raw document of document with corresponding id
 * @param {string} docId
 */
const getRawDoc = async (docId) => {
  const options = {
    url: `https://wm-ingest-pipeline-rest-1.prod.dart.worldmodelers.com/dart/api/v1/cdrs/raw/${docId}`,
    // url: `${process.env.DART_DOCUMENT_RETRIEVAL_URL}/${docId}`,
    method: 'GET',
    headers: {
      Authorization: basicAuthToken
    }
  };
  return request(options);
};


/**
 * Sends a file to the DART server for parsing and returns document meta text.
 */
const sendFileForExtraction = async (fileToUpload) => {
  const formData = {
    file: {
      value: fileToUpload.buffer,
      options: {
        filename: fileToUpload.originalname,
        contentType: fileToUpload.mimeType
      }
    }
  };
  const options = {
    url: process.env.DART_SERVICE_URL + '/extract',
    method: 'POST',
    headers: {
      'Authorization': basicAuthToken,
      'Content-type': 'application/json'
    },
    formData: formData
  };
  const result = await requestAsPromise(options);
  return result;
};

/**
 * Uploads the triaged document to DART S3 storage.
 *
 * @param {Object}  payload       triaged CDR document.
 *
 * @return {string} DART document id
 */
const submitCdrExtractionToDart = async (payload) => {
  const options = {
    url: process.env.DART_SERVICE_URL + '/submit/cdr',
    method: 'POST',
    headers: {
      'Authorization': basicAuthToken,
      'Content-type': 'application/json'
    },
    json: payload
  };
  const result = await requestAsPromise(options);
  return result;
};

/**
 * Uploads the triaged document to DART S3 storage.
 *
 * @param {Object}   file          multiform uploaded file.
 * @param {String}   documentId    DART document id.
 *
 * @return {string} stored document file name
 */
const uploadToDart = async (file, documentId) => {
  const fileExt = file.originalname.split('.').pop();
  const formData = {
    file: {
      value: file.buffer,
      options: {
        filename: file.originalname,
        contentType: file.mimeType
      }
    }
  };
  const options = {
    url: process.env.DART_SERVICE_URL + `/dart/api/v1/rawdocs/${documentId}.${fileExt}`, // name of file stored in DART S3
    method: 'POST',
    headers: {
      'Authorization': basicAuthToken,
      'Content-type': 'application/json'
    },
    formData
  };
  const result = await requestAsPromise(options);
  return result;
};

module.exports = {
  getRawDoc,
  sendFileForExtraction,
  submitCdrExtractionToDart,
  uploadToDart
};
