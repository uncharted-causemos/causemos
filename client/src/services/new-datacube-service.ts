import API from '@/api/api';
import { Filters } from '@/types/Filters';

/**
 * Get datacubes
 * @param {Filters} filters
 */
export const getDatacubes = async (filters: Filters) => {
  const { data } = await API.get(`maas/new-datacubes?filters=${JSON.stringify(filters)}`);
  return data;
};

export default {
  getDatacubes
};
