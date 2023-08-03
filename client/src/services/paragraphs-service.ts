import API from '@/api/api';
import { DojoParagraphDetails, GetDocumentsResponse } from '@/types/IndexDocuments';

const SEARCH_PATH = 'dojo/paragraphs/search';
const GET_DOC_PATH = 'dojo/documents';
const GET_HIGHLIGHTS = 'dojo/paragraphs/highlight';

export const searchParagraphs = async (searchString: string) => {
  if (searchString) {
    const result = await API.get(SEARCH_PATH, {
      params: { searchString: encodeURI(searchString) },
    });
    return result.data;
  }
};

export enum DocumentSortField {
  CreationDate = 'creation_date',
  UploadDate = 'upload_date',
}
export enum DocumentSortOrderOption {
  Ascending = 'asc',
  Descending = 'desc',
}

export const getDocuments = async (
  scroll_id: string,
  size: number,
  sort_by: DocumentSortField,
  order: DocumentSortOrderOption
): Promise<GetDocumentsResponse> => {
  const params = {
    scroll_id,
    size,
    sort_by,
    order,
  };
  const result = await API.get(GET_DOC_PATH, { params });
  return result.data;
};

export const getDocument = async (docId: string) => {
  if (docId) {
    const result = await API.get(`${GET_DOC_PATH}/${docId}`);
    return result.data;
  }
};

export const getHighlights = async (details: DojoParagraphDetails) => {
  details.query = encodeURI(details.query);
  const result = await API.post(GET_HIGHLIGHTS, details, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return result.data;
};

export const getDocumentParagraphs = async (
  docId: string,
  scrollId: string | null,
  minParagraphs = 1
) => {
  if (docId) {
    const result = await API.get(
      `${GET_DOC_PATH}/${docId}/paragraphs?min_paragraphs=${minParagraphs}${
        scrollId !== null ? '&scroll_id='.concat(scrollId) : ''
      }`
    );
    return result.data;
  }
};

export default {
  searchParagraphs,
  getDocument,
  getDocumentParagraphs,
};
