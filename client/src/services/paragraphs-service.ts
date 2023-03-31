import API from '@/api/api';
import { DojoParagraphDetails } from '@/types/Dojo';

const SEARCH_PATH = 'dojo/paragraphs/search';
const GET_DOC_PATH = 'dojo/documents';
const GET_HIGHLIGHTS = 'dojo/paragraphs/highlight';

export const searchParagraphs = async (searchString: string) => {
  if (searchString) {
    const result = await API.get(SEARCH_PATH, { params: { searchString } });
    return result.data;
  }
};

export const getDocument = async (docId: string) => {
  if (docId) {
    const result = await API.get(`${GET_DOC_PATH}/${docId}`);
    return result.data;
  }
};

export const getHighlights = async (details: DojoParagraphDetails) => {
  const result = await API.post(GET_HIGHLIGHTS, details, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return result.data;
};

export default {
  searchParagraphs,
  getDocument,
};
