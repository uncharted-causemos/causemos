const requestAsPromise = rootRequire('/util/request-as-promise');
const authUtil = rootRequire('/util/auth-util');

const DOJO_PARAGRAPHS_URL = process.env.DOJO_URL + '/paragraphs';
const DOJO_PARAGRAPHS_SEARCH_URL = process.env.DOJO_URL + '/paragraphs/search';
const DOJO_FEATURES_SEARCH_URL = process.env.DOJO_URL + '/features/search';
const DOJO_DOCUMENT_URL = process.env.DOJO_URL + '/documents';
const DOJO_AUTH = authUtil.getBasicAuthToken(process.env.DOJO_USERNAME, process.env.DOJO_PASSWORD);

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
  const response = await requestAsPromise(requestOptions);
  return response;
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
  const response = await requestAsPromise(requestOptions);
  return response;
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

  const response = await requestAsPromise(requestOptions);
  return response;
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
    },
  };

  const response = await requestAsPromise(requestOptions);
  return response;
};

module.exports = {
  getDocument,
  getParagraphs,
  searchParagraphs,
  searchFeatures,
};
