import API from '@/api/api';

interface DocumentMetadata {
  id: string,
  author: string,
  docTitle: string,
  publisherName: string
}

export const getDocument = async (documentId: string) => {
  const result = await API.get(`documents/${documentId}`);
  return result;
};

export const updateDocument = async (updatedDocumentInfo: DocumentMetadata) => {
  const {
    id,
    author,
    docTitle,
    publisherName
  } = updatedDocumentInfo;
  const params = {
    id,
    author,
    doc_title: docTitle,
    publisher_name: publisherName
  };
  const result = await API.post(`documents/${id}`, params);
  return result;
};
