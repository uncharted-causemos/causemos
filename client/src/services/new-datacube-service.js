import API from '@/api/api';

/**
 * Get datacubes
 * @param {Filters} filters
 */
export const getDatacubes = async (filters) => {
  const { data } = await API.get(`maas/new-datacubes?filters=${JSON.stringify(filters)}`);
  return data;
};

export default {
  getDatacubes
};
