const requestAsPromise = require('#@/util/request-as-promise.js');
const authUtil = require('#@/util/auth-util.js');

const DOJO_DOC_PARAGRAPH_LIMIT = 200;
const DOJO_PARAGRAPHS_HIGHLIGHT_URL = process.env.DOJO_URL + '/paragraphs/highlight';
const DOJO_PARAGRAPHS_URL = process.env.DOJO_URL + '/paragraphs';
const DOJO_PARAGRAPHS_SEARCH_URL = process.env.DOJO_URL + '/paragraphs/search';
const DOJO_FEATURES_SEARCH_URL = process.env.DOJO_URL + '/features/search';
const DOJO_DOCUMENT_URL = process.env.DOJO_URL + '/documents';
const DOJO_RECOMMENDER_URL = process.env.DOJO_RECOMMENDER_URL;
const DOJO_AUTH = authUtil.getBasicAuthToken(process.env.DOJO_USERNAME, process.env.DOJO_PASSWORD);

const getCausesAndEffects = async (details) => {
  const requestOptions = {
    method: 'POST',
    url: DOJO_RECOMMENDER_URL,
    json: details,
    headers: {
      'Content-type': 'application/json',
      Accept: 'application/json',
      Authorization: DOJO_AUTH,
    },
  };
  return await requestAsPromise(requestOptions);
};
const getCauses = async (details) => {
  const requestOptions = {
    method: 'POST',
    url: `${DOJO_RECOMMENDER_URL}/causes`,
    json: details,
    headers: {
      'Content-type': 'application/json',
      Accept: 'application/json',
      Authorization: DOJO_AUTH,
    },
  };
  return await requestAsPromise(requestOptions);
};

const getEffects = async (details) => {
  const requestOptions = {
    method: 'POST',
    url: `${DOJO_RECOMMENDER_URL}/effects`,
    json: details,
    headers: {
      'Content-type': 'application/json',
      Accept: 'application/json',
      Authorization: DOJO_AUTH,
    },
  };
  return await requestAsPromise(requestOptions);
};

const getDocuments = async (scrollId, size, sortBy, order) => {
  const requestOptions = {
    method: 'GET',
    url: DOJO_DOCUMENT_URL,
    json: {},
    headers: {
      'Content-type': 'application/json',
      Accept: 'application/json',
      Authorization: DOJO_AUTH,
    },
    qs: { size: size, scroll_id: scrollId, sort_by: sortBy, order },
  };
  return await requestAsPromise(requestOptions);
};

const getDocument = async (docId) => {
  const requestOptions = {
    method: 'GET',
    url: `${DOJO_DOCUMENT_URL}/${docId}`,
    json: {},
    headers: {
      'Content-type': 'application/json',
      Accept: 'application/json',
      Authorization: DOJO_AUTH,
    },
  };
  return await requestAsPromise(requestOptions);
};

const getDocumentParagraphs = async (docId, minParagraphs, scrollId) => {
  const qs = {
    size: DOJO_DOC_PARAGRAPH_LIMIT < minParagraphs ? minParagraphs : DOJO_DOC_PARAGRAPH_LIMIT,
  };

  if (scrollId) {
    qs.scroll_id = scrollId;
  }
  const requestOptions = {
    method: 'GET',
    url: `${DOJO_DOCUMENT_URL}/${docId}/paragraphs`,
    json: {},
    headers: {
      'Content-type': 'application/json',
      Accept: 'application/json',
      Authorization: DOJO_AUTH,
    },
    qs,
  };
  return requestAsPromise(requestOptions);
};

const getParagraphs = async () => {
  const requestOptions = {
    method: 'GET',
    url: DOJO_PARAGRAPHS_URL,
    json: {},
    headers: {
      'Content-type': 'application/json',
      Accept: 'application/json',
      Authorization: DOJO_AUTH,
    },
  };
  return await requestAsPromise(requestOptions);
};

const searchParagraphs = async (searchString, scrollId = '', size = 10) => {
  const requestOptions = {
    method: 'GET',
    url: DOJO_PARAGRAPHS_SEARCH_URL,
    json: {},
    headers: {
      'Content-type': 'application/json',
      Accept: 'application/json',
      Authorization: DOJO_AUTH,
    },
    qs: {
      query: searchString,
      // scroll_id: scrollId,
      size: size,
    },
  };

  return await requestAsPromise(requestOptions);
};

const searchFeatures = async (searchString) => {
  const requestOptions = {
    method: 'GET',
    url: DOJO_FEATURES_SEARCH_URL,
    json: {},
    headers: {
      'Content-type': 'application/json',
      Accept: 'application/json',
      Authorization: DOJO_AUTH,
    },
    qs: {
      query: searchString,
      size: 50,
    },
  };

  return await requestAsPromise(requestOptions);
};

const getHighlights = async (details) => {
  const requestOptions = {
    method: 'POST',
    url: DOJO_PARAGRAPHS_HIGHLIGHT_URL,
    json: details,
    headers: {
      'Content-type': 'application/json',
      Accept: 'application/json',
      Authorization: DOJO_AUTH,
    },
  };
  return await requestAsPromise(requestOptions);
};

module.exports = {
  getDocuments,
  getDocument,
  getDocumentParagraphs,
  getParagraphs,
  searchParagraphs,
  searchFeatures,
  getHighlights,
  getCausesAndEffects,
  getCauses,
  getEffects,
};
