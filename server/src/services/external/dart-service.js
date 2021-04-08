const moment = require('moment');
const request = require('request');
// const requestAsPromise = rootRequire('/util/request-as-promise');
const auth = rootRequire('/util/auth-util');
const Logger = rootRequire('/config/logger');

const basicAuthToken = auth.getBasicAuthToken(process.env.DART_SERVICE_USERNAME, process.env.DART_SERVICE_PASSWORD);

const DART_SERVICE_URL = 'https://wm-ingest-pipeline-rest-1.prod.dart.worldmodelers.com/dart/api/v1';
const DART_READER_URL = 'https://wm-ingest-pipeline-rest-1.prod.dart.worldmodelers.com/dart/api/v1/readers';
const TIMEOUT = 3 * 1000;

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
      Authorization: basicAuthToken
    },
    timeout: TIMEOUT
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
        contentType: fileToUpload.mimeType
      }
    },
    metadata: metadata
  };
  const options = {
    url: DART_SERVICE_URL + '/forklift/upload',
    method: 'POST',
    headers: {
      'Authorization': basicAuthToken,
      'Content-type': 'application/json'
    },
    formData: formData
  };

  // Stub
  console.log(options);
  Logger.info(JSON.stringify(options.formData.metadata));
  return { id: 'xyz' };

  // FIXME: Waiting for DART service to go up - Mar 17, 2021
  // const result = await requestAsPromise(options);
  // return result;
};


/**
 * List out reader status after a given timestamp
 */
const queryReadersStatus = async (timestamp) => {
  // Format timestamp to yyyy-mm-dd hh:mm:ss
  const t = moment.utc(+timestamp).format('YYYY-MM-DD hh:mm:ss');

  const options = {
    url: `${DART_READER_URL}/query`,
    method: 'POST',
    headers: {
      Authorization: basicAuthToken
    },
    json: {
      metadata: {
        timestamp: {
          after: t
        }
      }
    },
    timeout: TIMEOUT
  };

  // Stub
  console.log(JSON.stringify(options));
  return {
    records: [
      {
        identity: 'eidos',
        version: '1.0',
        document_id: 'doc1',
        storage_key: 'aaa1'
      },
      {
        identity: 'sofia',
        version: '1.0',
        document_id: 'doc1',
        storage_key: 'aaa2'
      }
    ]
  };

  // FIXME: Waiting for DART service to go up - Apr 8, 2021
  // const result = await requestAsPromise(options);
  // return result;
};


/**
 * Sends a file to the DART server for parsing and returns document meta text.
 */
// const sendFileForExtraction = async (fileToUpload) => {
//   const formData = {
//     file: {
//       value: fileToUpload.buffer,
//       options: {
//         filename: fileToUpload.originalname,
//         contentType: fileToUpload.mimeType
//       }
//     }
//   };
//   const options = {
//     url: process.env.DART_SERVICE_URL + '/extract',
//     method: 'POST',
//     headers: {
//       'Authorization': basicAuthToken,
//       'Content-type': 'application/json'
//     },
//     formData: formData
//   };
//   const result = await requestAsPromise(options);
//   return result;
// };

/**
 * Uploads the triaged document to DART S3 storage.
 *
 * @param {Object}  payload       triaged CDR document.
 *
 * @return {string} DART document id
 */
// const submitCdrExtractionToDart = async (payload) => {
//   const options = {
//     url: process.env.DART_SERVICE_URL + '/submit/cdr',
//     method: 'POST',
//     headers: {
//       'Authorization': basicAuthToken,
//       'Content-type': 'application/json'
//     },
//     json: payload
//   };
//   const result = await requestAsPromise(options);
//   return result;
// };

/**
 * Uploads the triaged document to DART S3 storage.
 *
 * @param {Object}   file          multiform uploaded file.
 * @param {String}   documentId    DART document id.
 *
 * @return {string} stored document file name
 */
// const uploadToDart = async (file, documentId) => {
//   const fileExt = file.originalname.split('.').pop();
//   const formData = {
//     file: {
//       value: file.buffer,
//       options: {
//         filename: file.originalname,
//         contentType: file.mimeType
//       }
//     }
//   };
//   const options = {
//     url: process.env.DART_SERVICE_URL + `/dart/api/v1/rawdocs/${documentId}.${fileExt}`, // name of file stored in DART S3
//     method: 'POST',
//     headers: {
//       'Authorization': basicAuthToken,
//       'Content-type': 'application/json'
//     },
//     formData
//   };
//   const result = await requestAsPromise(options);
//   return result;
// };

module.exports = {
  getRawDoc,
  uploadDocument,
  queryReadersStatus
  // sendFileForExtraction,
  // submitCdrExtractionToDart,
  // uploadToDart
};
