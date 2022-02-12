import API from '@/api/api';

interface DocumentMetadata {
  id: string,
}

export const getDocument = async (documentId: string) => {
  const result = await API.get(`documents/${documentId}`);
  return result;
};

export const updateDocument = async (updatedDocumentInfo: DocumentMetadata) => {
  const result = await API.post(`documents/${updatedDocumentInfo.id}`, updatedDocumentInfo);
  return result;
};
