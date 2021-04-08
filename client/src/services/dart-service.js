// For uploading documents and sync'ing status
import API from '@/api/api';

const uploadDocument = async (formData) => {
  const result = await API.post('dart/corpus', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return result.data;
};

const getReadersStatus = async (timestamp) => {
  const result = await API.get('dart/readers-status', { params: { timestamp } });
  return result.data.records;
};

export default {
  uploadDocument,
  getReadersStatus
};
