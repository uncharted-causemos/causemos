import API from '@/api/api';

const SEARCH_PATH = 'dojo/paragraphs/search';
const GET_DOC_PATH = 'dojo/documents';

export const searchParagraphs = async (searchString) => {
  const result = await API.get(SEARCH_PATH, { params: { searchString } });
  return result.data;
};

export const getDocument = async (docId) => {
  const result = await API.get(`${GET_DOC_PATH}/${docId}`);
  return result.data;
};

export default {
  searchParagraphs,
  getDocument,
};
