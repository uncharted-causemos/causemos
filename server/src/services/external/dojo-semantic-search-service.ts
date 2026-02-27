import requestAsPromise from '#@/util/request-as-promise.js';
import * as authUtil from '#@/util/auth-util.js';

const DOJO_DOC_PARAGRAPH_LIMIT = 200;
const DOJO_PARAGRAPHS_HIGHLIGHT_URL = process.env.DOJO_URL + '/paragraphs/highlight';
const DOJO_PARAGRAPHS_URL = process.env.DOJO_URL + '/paragraphs';
const DOJO_PARAGRAPHS_SEARCH_URL = process.env.DOJO_URL + '/paragraphs/search';
const DOJO_FEATURES_SEARCH_URL = process.env.DOJO_URL + '/features/search';
const DOJO_DOCUMENT_URL = process.env.DOJO_URL + '/documents';
const DOJO_RECOMMENDER_URL = process.env.DOJO_RECOMMENDER_URL;
const DOJO_AUTH = authUtil.getBasicAuthToken(process.env.DOJO_USERNAME, process.env.DOJO_PASSWORD);

export const getCausesAndEffects = async (details: any) => {
  const requestOptions = {
    method: 'POST',
    url: DOJO_RECOMMENDER_URL as string,
    data: details,
    headers: {
      'Content-type': 'application/json',
      Accept: 'application/json',
      Authorization: DOJO_AUTH,
    },
  };
  return await requestAsPromise(requestOptions);
};

export const getCauses = async (details: any) => {
  const requestOptions = {
    method: 'POST',
    url: `${DOJO_RECOMMENDER_URL}/causes`,
    data: details,
    headers: {
      'Content-type': 'application/json',
      Accept: 'application/json',
      Authorization: DOJO_AUTH,
    },
  };
  return await requestAsPromise(requestOptions);
};

export const getEffects = async (details: any) => {
  const requestOptions = {
    method: 'POST',
    url: `${DOJO_RECOMMENDER_URL}/effects`,
    data: details,
    headers: {
      'Content-type': 'application/json',
      Accept: 'application/json',
      Authorization: DOJO_AUTH,
    },
  };
  return await requestAsPromise(requestOptions);
};

export const getDocuments = async (
  scrollId: string,
  size?: number,
  sortBy?: string,
  order?: string
) => {
  const requestOptions = {
    method: 'GET',
    url: DOJO_DOCUMENT_URL as string,
    headers: {
      'Content-type': 'application/json',
      Accept: 'application/json',
      Authorization: DOJO_AUTH,
    },
    params: { size, scroll_id: scrollId, sort_by: sortBy, order },
  };
  return await requestAsPromise(requestOptions);
};

export const getDocument = async (docId: string) => {
  const requestOptions = {
    method: 'GET',
    url: `${DOJO_DOCUMENT_URL}/${docId}`,
    headers: {
      'Content-type': 'application/json',
      Accept: 'application/json',
      Authorization: DOJO_AUTH,
    },
  };
  return await requestAsPromise(requestOptions);
};

export const getDocumentParagraphs = async (
  docId: string,
  minParagraphs?: number,
  scrollId?: string
) => {
  const params: Record<string, any> = {
    size:
      DOJO_DOC_PARAGRAPH_LIMIT < (minParagraphs ?? 0) ? minParagraphs : DOJO_DOC_PARAGRAPH_LIMIT,
  };

  if (scrollId) {
    params.scroll_id = scrollId;
  }
  const requestOptions = {
    method: 'GET',
    url: `${DOJO_DOCUMENT_URL}/${docId}/paragraphs`,
    headers: {
      'Content-type': 'application/json',
      Accept: 'application/json',
      Authorization: DOJO_AUTH,
    },
    params,
  };
  return requestAsPromise(requestOptions);
};

export const getParagraphs = async () => {
  const requestOptions = {
    method: 'GET',
    url: DOJO_PARAGRAPHS_URL as string,
    headers: {
      'Content-type': 'application/json',
      Accept: 'application/json',
      Authorization: DOJO_AUTH,
    },
  };
  return await requestAsPromise(requestOptions);
};

export const searchParagraphs = async (searchString: string, _scrollId = '', size = 10) => {
  const requestOptions = {
    method: 'GET',
    url: DOJO_PARAGRAPHS_SEARCH_URL as string,
    headers: {
      'Content-type': 'application/json',
      Accept: 'application/json',
      Authorization: DOJO_AUTH,
    },
    params: {
      query: searchString,
      // scroll_id: scrollId,
      size: size,
    },
  };

  return await requestAsPromise(requestOptions);
};

export const searchFeatures = async (searchString: string, _prefix?: string, _size?: number) => {
  const requestOptions = {
    method: 'GET',
    url: DOJO_FEATURES_SEARCH_URL as string,
    headers: {
      'Content-type': 'application/json',
      Accept: 'application/json',
      Authorization: DOJO_AUTH,
    },
    params: {
      query: searchString,
      size: 50,
    },
  };

  return await requestAsPromise(requestOptions);
};

export const getHighlights = async (details: any) => {
  const requestOptions = {
    method: 'POST',
    url: DOJO_PARAGRAPHS_HIGHLIGHT_URL as string,
    data: details,
    headers: {
      'Content-type': 'application/json',
      Accept: 'application/json',
      Authorization: DOJO_AUTH,
    },
  };
  return await requestAsPromise(requestOptions);
};
