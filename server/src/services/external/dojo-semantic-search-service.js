const requestAsPromise = rootRequire('/util/request-as-promise');
const authUtil = rootRequire('/util/auth-util');

const DOJO_PARAGRAPHS_URL = process.env.JATAWARE_DOJO_URL + '/paragraphs';
const DOJO_PARAGRAPHS_SEARCH_URL = process.env.JATAWARE_DOJO_URL + '/paragraphs/search';
const DOJO_AUTH = authUtil.getBasicAuthToken(
  process.env.JATAWARE_DOJO_UID,
  process.env.JATAWARE_DOJO_PWD
);

const getParagraphs = async () => {
  const requestOptions = {
    method: 'GET',
    url: DOJO_PARAGRAPHS_URL,
    headers: {
      'Content-type': 'application/json',
      Accept: 'application/json',
      Authorization: DOJO_AUTH,
    },
  };
  const response = await requestAsPromise(requestOptions);
  if (response) {
    return response;
  } else {
    throw new Error('DOJO enp-point request failed.');
  }
};

const searchParagraphs = async (searchString, scrollId = null, size = 10) => {
  const requestOptions = {
    method: 'GET',
    url: DOJO_PARAGRAPHS_SEARCH_URL,
    headers: {
      'Content-type': 'application/json',
      Accept: 'application/json',
      Authorization: DOJO_AUTH,
    },
    json: {
      query: searchString,
      // scroll_id: scrollId,
      size: size,
    },
  };

  const response = await requestAsPromise(requestOptions);
  if (response) {
    return response;
  } else {
    throw new Error('DOJO enp-point request failed.');
  }
};

module.exports = {
  getParagraphs,
  searchParagraphs,
};
