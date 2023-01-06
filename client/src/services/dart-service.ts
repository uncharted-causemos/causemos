// For uploading documents and sync'ing status
import API from '@/api/api';

export const uploadDocument = async (formData: FormData) => {
  const result = await API.post('dart/corpus', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return result.data;
};

export const getReadersStatus = async (timestamp: number) => {
  const result = await API.get('dart/readers-status', { params: { timestamp } });
  return result.data.records;
};

export default {
  uploadDocument,
  getReadersStatus,
};
