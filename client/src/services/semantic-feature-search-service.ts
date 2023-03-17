import API from '@/api/api';

const FEATURE_SEARCH_ENDPOINT = 'dojo/features/search';

export interface DojoFeatureSearchResult {
  display_name: string;
  description: string;
  name: string;
  type: string;
  unit: string;
  unit_description: string;
  ontologies: string;
  is_primary: string;
  data_resolution: string;
  alias: {};
  owner_dataset: {
    id: string;
    name: string;
  };
}

export const searchFeatures = async (query: string): Promise<DojoFeatureSearchResult[]> => {
  const { data } = await API.get(FEATURE_SEARCH_ENDPOINT, {
    params: {
      query,
    },
  });
  return data.results;
};
