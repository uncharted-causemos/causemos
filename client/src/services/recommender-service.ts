import API from '@/api/api';
import {
  CausalRecommenderQuery,
  CausalRecommenderResponse,
  CausalRecommenderResponseCauses,
  CausalRecommenderResponseEffects,
} from '@/types/IndexDocuments';

const CAUSES_AND_EFFECTS_PATH = 'dojo/causal-recommender';
const CAUSES_PATH = 'dojo/causal-recommender/causes';
const EFFECTS_PATH = 'dojo/causal-recommender/effects';

export const getCausesAndEffects = async (
  details: CausalRecommenderQuery
): Promise<CausalRecommenderResponse> => {
  const result = await API.post(CAUSES_AND_EFFECTS_PATH, details, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return result.data;
};

export const getCauses = async (
  details: CausalRecommenderQuery
): Promise<CausalRecommenderResponseCauses> => {
  const result = await API.post(CAUSES_PATH, details, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return result.data;
};

export const getEffects = async (
  details: CausalRecommenderQuery
): Promise<CausalRecommenderResponseEffects> => {
  const result = await API.post(EFFECTS_PATH, details, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return result.data;
};
