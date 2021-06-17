import API from '@/api/api';
import { Filters } from '@/types/Filters';
import { ModelRun } from '@/types/ModelRun';

/**
 * Get datacubes
 * @param {Filters} filters
 */
export const getDatacubes = async (filters: Filters) => {
  const { data } = await API.get(
    `maas/new-datacubes?filters=${JSON.stringify(filters)}`
  );
  return data;
};

export const getModelRunMetadata = async (modelId: string) => {
  const { data } = await API.get<ModelRun[]>('/maas/model-runs', {
    params: { modelId }
  });
  return data;
};

export default {
  getDatacubes,
  getModelRunMetadata
};
