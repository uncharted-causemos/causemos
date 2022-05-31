import _ from 'lodash';
import API from '@/api/api';
import store from '@/store';
import aggregationsUtil from '@/utils/aggregations-util';
import { Statement, ConceptMatchCandidate } from '@/types/Statement';

// Emulates an enum
export enum CORRECTION_TYPES {
  POLARITY = 1,
  ONTOLOGY_ALL = 2,
  ONTOLOGY_SUBJ = 3,
  ONTOLOGY_OBJ = 4,
  POLARITY_UNKNOWN = 5
}

// Emulates an enum
export enum CURATION_STATES {
  NON_EVALUATED = 0,
  EDITED = 1,
  VETTED = 2
}

type StatementsPromise = Promise<Statement[]>

export interface ConceptChange {
  oldValue?: string;
  newValue?: string;
}

export interface PolarityChange {
  oldValue: number;
  newValue: number;
}

interface SimilarConcept {
  concept: string;
  score: number;
}

interface SimilarConceptData {
  similar_concepts: SimilarConcept[];
}


/**
 * Helpers
 */
const statementsScores = async (projectId: string, statementIds: Array<string>): StatementsPromise => {
  const results = await API.post(`/projects/${projectId}/statements-scores`, { ids: statementIds });
  return results.data;
};

const processCandidates = (candidates: Array<ConceptMatchCandidate>, acc: { [key: string]: number }) => {
  candidates.forEach(candidate => {
    const tmp = acc[candidate.name];
    if (!tmp || tmp < candidate.score) {
      acc[candidate.name] = candidate.score;
    }
  });
};

const topSuggestions = (acc: { [key: string]: number }, n: number) => {
  const entries = _.orderBy(Object.entries(acc), ([, v]) => -v).map(([name, score]) => {
    return { name, score };
  });
  return _.take(entries, n);
};


/**
 * Group by statement by polarity, then by subj+obj factor
 */
export const groupByPolarityAllFactors = (statements: Array<Statement>) => {
  const groups = aggregationsUtil.groupDataArray(statements, [
    // 1. Group by polarity
    {
      keyFn: (s) => s.wm.statement_polarity,
      sortFn: (s) => -s.count,
      metaFn: () => {
        const meta: { [key: string]: any } = {};
        meta.checked = false;
        meta.isSomeChildChecked = false;
        return meta;
      }
    },
    // 2. Group by subj and obj
    {
      keyFn: (s) => s.subj.factor + s.subj.polarity + '///' + s.obj.factor + s.obj.polarity,
      sortFn: (s) => {
        // Sort by total number of evidence
        return -s.meta.num_evidence;
      },
      metaFn: (s) => {
        const sample = s.dataArray[0];
        const meta: { [key: string]: any } = {};
        meta.checked = false;
        meta.state = sample.wm.state;

        meta.polarity = sample.wm.statement_polarity;
        meta.subj_concept_name = sample.subj.concept;
        meta.subj_polarity = sample.subj.polarity;
        meta.subj = sample.subj;
        meta.obj_polarity = sample.obj.polarity;
        meta.obj_concept_name = sample.obj.concept;
        meta.obj = sample.obj;

        meta.num_evidence = _.sumBy(s.dataArray, d => {
          return d.wm.num_evidence;
        });
        return meta;
      }
    }
  ]);
  return groups;
};


/**
 * Group by any of subj.facor or obj.factor
 */
export const groupByConceptFactor = (statements: Array<Statement>, concept: string) => { // eslint-disable-line
  // 1) Precompute a __factor attribute so we can do a group by without merging subj.factor and obj.factor.
  statements.forEach(statement => {
    if (statement.subj.concept === concept) {
      statement.__factor = statement.subj.factor;
    } else {
      statement.__factor = statement.obj.factor;
    }
  });

  // 2) Group by __factor, sort decending by count
  const factorGroups = aggregationsUtil.groupDataArray(statements, [
    {
      keyFn: (s) => s.__factor,
      sortFn: (s) => {
        // Sort by total number of evidence
        return -s.meta.num_evidence;
      },
      metaFn: (s) => {
        const meta: { [key: string]: any } = {};
        meta.checked = false;
        meta.num_evidence = _.sumBy(s.dataArray, 'wm.num_evidence');
        return meta;
      }
    }
  ]);
  return factorGroups;
};

/**
 * Get suggestions based on statements and whether it is subject or object
 */
export const getStatementConceptSuggestions = async (projectId: string, statementIds: Array<string>, correctionType: number) => {
  const results = await statementsScores(projectId, statementIds);

  // Create unique top-X list
  const uniqueCandidates = {};
  if (correctionType === CORRECTION_TYPES.ONTOLOGY_SUBJ) {
    results.forEach(s => {
      processCandidates(s.subj.candidates, uniqueCandidates);
    });
  } else {
    results.forEach(s => {
      processCandidates(s.obj.candidates, uniqueCandidates);
    });
  }
  return topSuggestions(uniqueCandidates, 10);
};

/**
 * Get suggestions based on statements factors
 */
export const getFactorConceptSuggestions = async (projectId: string, statementIds: Array<string>, factors: Array<string>) => {
  const results = await statementsScores(projectId, statementIds);

  // Create unique top-X list
  const uniqueCandidates = {};
  results.forEach(s => {
    if (factors.includes(s.subj.factor)) {
      processCandidates(s.subj.candidates, uniqueCandidates);
    }
    if (factors.includes(s.obj.factor)) {
      processCandidates(s.obj.candidates, uniqueCandidates);
    }
  });
  return topSuggestions(uniqueCandidates, 10);
};


/**
 * Get curation recommendation based on current curation-action
 */
export const getFactorGroundingRecommendations = async (projectId: string, currentGrounding: string, factorText: string) => {
  const currentCAG = store.getters['app/currentCAG'];
  const payload = {
    project_id: projectId,
    factor: factorText,
    num_recommendations: 10,
    cag_id: currentCAG,
    current_grounding: currentGrounding
  };
  const result = await (API.get('curation_recommendations/regrounding', { params: payload }));
  return result;
};


/**
 * Mark statements as deleted
 */
export const discardStatements = async (projectId: string, statementIds: Array<string>) => {
  const result = await API.put(`/projects/${projectId}`, {
    payload: {
      updateType: 'discard_statement'
    },
    ids: statementIds
  });

  if (result.status === 200) {
    await store.dispatch('kb/incrementCurationCounter', statementIds.length);
    await store.dispatch('app/setUpdateToken', result.data.updateToken);

    const currentCAG = store.getters['app/currentCAG'];
    if (!_.isNil(currentCAG)) {
      await API.post(`cags/${currentCAG}/recalculate`);
    }
  }
  return result;
};

/**
 * Vet/acknolwedge that the statements are valid
 */
export const vetStatements = async (projectId: string, statementIds: Array<string>) => {
  const result = await API.put(`/projects/${projectId}`, {
    payload: {
      updateType: 'vet_statement'
    },
    ids: statementIds
  });

  if (result.status === 200) {
    await store.dispatch('kb/incrementCurationCounter', statementIds.length);
    await store.dispatch('app/setUpdateToken', result.data.updateToken);
  }
  return result;
};


/**
 * Reverse subj/obj and their polarities
 */
export const reverseStatementsRelation = async (projectId: string, statementIds: Array<string>) => {
  const result = await API.put(`/projects/${projectId}`, {
    payload: {
      updateType: 'reverse_relation'
    },
    ids: statementIds
  });

  if (result.status === 200) {
    await store.dispatch('kb/incrementCurationCounter', statementIds.length);
    await store.dispatch('app/setUpdateToken', result.data.updateToken);

    const currentCAG = store.getters['app/currentCAG'];
    if (!_.isNil(currentCAG)) {
      await API.post(`cags/${currentCAG}/recalculate`);
    }
  }
  return result;
};



/**
 * Update factors's grounding concepts.
 * It is assumed that all statements here have the same subj/obj factor groundings.
 *
 * @param {object} subj
 * @param {string} subj.oldValue - current concept
 * @param {string} subj.newValue - new concept
 * @param {object} obj
 * @param {string} obj.oldValue - current concept
 * @param {string} obj.newValue - new concept
 */
export const updateStatementsFactorGrounding = async (projectId: string, statementIds: Array<string>, subj: ConceptChange, obj: ConceptChange) => {
  const result = await API.put(`/projects/${projectId}`, {
    payload: {
      updateType: 'factor_grounding',
      subj,
      obj
    },
    ids: statementIds
  });

  if (result.status === 200) {
    await store.dispatch('kb/incrementCurationCounter', statementIds.length);
    await store.dispatch('app/setUpdateToken', result.data.updateToken);

    const currentCAG = store.getters['app/currentCAG'];
    if (!_.isNil(currentCAG)) {
      await API.post(`cags/${currentCAG}/recalculate`);
    }
  }
  return result;
};

/**
 * Track data around curations, such as when factors are regrounded, or when recommendations are accepted
 *
 * @param {string} trackingId - unique trackingId for a curation
 * @param {object} payload - any additional logging data such as statementId, factorType etc...
 */
export const trackCurations = async (trackingId: string, payload: object) => {
  const result = await API.put(`/curation_recommendations/tracking/${trackingId}`, {
    payload: payload
  });
  return result;
};


/**
 * Update statement polarity.
 * Note: There is no CAG recalculation as polarity does not affect edge directions.
 *
 * @param {object} subj
 * @param {number} subj.oldValue - current concept
 * @param {number} subj.newValue - new concept
 * @param {object} obj
 * @param {number} obj.oldValue - current concept
 * @param {number} obj.newValue - new concept
*/
export const updateStatementsPolarity = async (projectId: string, statementIds: Array<string>, subj: PolarityChange, obj: PolarityChange) => {
  const result = await API.put(`/projects/${projectId}`, {
    payload: {
      updateType: 'factor_polarity',
      subj,
      obj
    },
    ids: statementIds
  });
  if (result.status === 200) {
    await store.dispatch('kb/incrementCurationCounter', statementIds.length);
    await store.dispatch('app/setUpdateToken', result.data.updateToken);
  }
  return result;
};


/**
 * Get curation recommendations for evidence
 */
export const getEvidenceRecommendations = async (projectId: string, subjConcept: string, objConcept: string) => {
  const payload = {
    project_id: projectId,
    num_recommendations: 10,
    subj_concept: subjConcept,
    obj_concept: objConcept
  };
  const result = await (API.get('curation_recommendations/edge-regrounding', { params: payload }));
  return result.data;
};


export const getSimilarConcepts = async (projectId: string, concept: string): Promise<SimilarConceptData> => {
  const payload = {
    project_id: projectId,
    num_recommendations: 10,
    concept
  };
  const result = await (API.get('curation_recommendations/similar-concepts', { params: payload }));
  return result.data as SimilarConceptData;
};
