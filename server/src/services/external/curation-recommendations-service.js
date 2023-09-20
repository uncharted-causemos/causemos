const _ = require('lodash');
const requestAsPromise = require('#@/util/request-as-promise.js');
const ES = require('#@/adapters/es/client.js');
const { Adapter, RESOURCE, SEARCH_LIMIT } = require('#@/adapters/es/adapter.js');
const Logger = require('#@/config/logger.js');
const { getCache } = require('#@/cache/node-lru-cache.js');

const headers = {
  'Content-type': 'application/json',
  Accept: 'application/json',
};

const statementIncludes = [
  'id',
  'subj.factor',
  'obj.factor',
  'subj.polarity',
  'obj.polarity',
  'wm.statement_polarity',
  'evidence.evidence_context.text',
  'evidence.evidence_context.agents_text',
  'evidence.document_context.doc_id',
  'evidence.document_context.author',
  'evidence.document_context.publication_date',
  'evidence.document_context.publisher_name',
];

// Note: Since we sometimes filter the results from the curation service based on the statementIds in the CAG,
// we request a high number of recommendations, filter, and then return only numRecommendations requested by client
const PRE_FILTERED_NUM_RECOMMENDATIONS = 500;

/**
 * Get recommendation for a factor-regrounding operation
 *
 * @param {string} projectId - project identifier
 * @param {array} statementIds - list of statement identifiers that compose the "visible-graph"
 * @param {string} factor - factor text
 * @param {number} numRecommendations
 */
const getFactorRecommendations = async (projectId, statementIds, factor, numRecommendations) => {
  Logger.info(
    `Factor recommendation: Project=${projectId}, Factor=${factor}, ${statementIds.length} statements,`
  );
  const payload = {
    knowledge_base_id: getCache(projectId).kb_id,
    factor,
    num_recommendations: PRE_FILTERED_NUM_RECOMMENDATIONS,
  };
  const options = {
    url: process.env.WM_CURATION_SERVICE_URL + '/recommendation/' + projectId + '/regrounding',
    method: 'POST',
    headers: headers,
    json: payload,
  };
  let result = { recommendations: [] };
  try {
    result = await requestAsPromise(options);
    result.recommendations = await _mapRegroundingRecommendationsToStatementIds(
      projectId,
      statementIds,
      result.recommendations
    );
    result.recommendations = result.recommendations.slice(0, numRecommendations);
  } catch (err) {
    Logger.error(err);
  }
  return result;
};

/**
 * Get recommendation for a polarity operation
 *
 * @param {string} projectId - project identifier
 * @arapm {array} statementIds - list of statement identifiers that compose the "visible-graph"
 * @param {string} subjFactor - factor text
 * @param {string} objFactor - factor text
 * @param {number} polarity before the curation
 * @param {number} numRecommendations
 */
const getPolarityRecommendations = async (
  projectId,
  statementIds,
  subjFactor,
  objFactor,
  polarity,
  numRecommendations
) => {
  Logger.info(
    `Polarity recommendation: Project=${projectId}, Subj=${subjFactor}, Obj=${objFactor}, Polarity=${polarity},  ${statementIds.length} statements,`
  );
  const payload = {
    knowledge_base_id: getCache(projectId).kb_id,
    subj_factor: subjFactor,
    obj_factor: objFactor,
    num_recommendations: PRE_FILTERED_NUM_RECOMMENDATIONS,
  };

  const options = {
    url: process.env.WM_CURATION_SERVICE_URL + '/recommendation/' + projectId + '/polarity',
    method: 'POST',
    headers: headers,
    json: payload,
  };
  let result = { recommendations: [] };
  try {
    result = await requestAsPromise(options);
    result.recommendations = await _mapPolarityRecommendationsToStatements(
      projectId,
      statementIds,
      polarity,
      result.recommendations
    );
    result.recommendations = result.recommendations.slice(0, numRecommendations);
  } catch (err) {
    Logger.error(err);
  }
  return result;
};

/**
 * Get recommendation for an empty edge
 *
 * @param {string} projectId - project identifier
 * @param {number} numRecommendations
 */
const getEmptyEdgeRecommendations = async (
  projectId,
  subjConcept,
  objConcept,
  numRecommendations
) => {
  Logger.info(`Edge recommendation: Project=${projectId}`);
  const payload = {
    knowledge_base_id: getCache(projectId).kb_id,
    subj_concept: subjConcept,
    obj_concept: objConcept,
    num_recommendations: numRecommendations,
  };

  const options = {
    url: process.env.WM_CURATION_SERVICE_URL + '/recommendation/' + projectId + '/edge-regrounding',
    method: 'POST',
    headers: headers,
    json: payload,
  };
  let result = { recommendations: [] };
  try {
    result = await requestAsPromise(options);
    result.recommendations = await _mapEmptyEdgeRecommendationsToStatements(
      projectId,
      result.recommendations
    );
  } catch (err) {
    Logger.error(err);
  }
  return result;
};

/**
 * Track curation and recommendations
 *
 * @param {string} trackingId - Identifier for the curation being upserted
 * @param {object} payload - any additional logging data such as statementId, curationType etc...
 */
const trackCuration = async (trackingId, payload) => {
  Logger.info(`Tracking curation with id: ${trackingId}`);
  const curationTracking = Adapter.get(RESOURCE.CURATION_TRACKING);
  const newDoc = { id: trackingId, tracking_data: payload };
  const idFn = (d) => d.id;
  curationTracking.insert(newDoc, idFn);
};

/**
 * Get similar concepts from the knowledge base given a concept
 *
 * @param {string} concept - concept to find similar concepts too
 * @param {string} projectId - project identifier
 * @param {number} numRecommendations
 *
 * returns {similar_concepts: [{concept: string, score: float}]}
 */
const getSimilarConcepts = async (projectId, concept, numRecommendations) => {
  const payload = {
    knowledge_base_id: getCache(projectId).kb_id,
    concept: concept,
    num_recommendations: numRecommendations,
  };

  const options = {
    url: process.env.WM_CURATION_SERVICE_URL + '/recommendation/similar-concepts',
    method: 'POST',
    headers: headers,
    json: payload,
  };

  let result = { similar_concepts: [] };
  try {
    result = await requestAsPromise(options);
  } catch (err) {
    Logger.error(err);
  }
  return result;
};

const _mapRegroundingRecommendationsToStatementIds = async (
  projectId,
  statementIds,
  recommendations
) => {
  const statementDocs = await _getStatementsForRegroundingRecommendations(
    projectId,
    statementIds,
    recommendations
  );
  if (_.isEmpty(statementDocs)) return [];
  const factorToStatementsMap = _buildFactorsToStatmentsMap(statementDocs);
  recommendations = recommendations.filter(
    (r) => r.factor in factorToStatementsMap && factorToStatementsMap[r.factor].length > 0
  );
  recommendations = recommendations.map((r) => {
    return {
      statements: factorToStatementsMap[r.factor],
      highlights: r.factor,
      score: r.score,
    };
  });
  recommendations.sort((r1, r2) => {
    return r1.score - r2.score; // Sort ascending
  });
  return recommendations;
};

const _getStatementsForRegroundingRecommendations = async (
  projectId,
  statementIds,
  recommendations
) => {
  const factors = recommendations.map((r) => r.factor);
  const client = ES.client;
  const response = await client.search({
    index: projectId,
    body: {
      size: SEARCH_LIMIT,
      _source: {
        includes: statementIncludes,
      },
      query: {
        bool: {
          filter: {
            terms: { id: statementIds },
          },
          should: [
            { terms: { 'subj.factor.raw': factors } },
            { terms: { 'obj.factor.raw': factors } },
          ],
          minimum_should_match: 1,
        },
      },
    },
  });
  const statementDocs = response.body.hits.hits;
  return statementDocs;
};

const _buildFactorsToStatmentsMap = (statementDocs) => {
  const factorToStatementsMap = {};

  const _updateMap = (factor, stmtDoc) => {
    const statements = _.get(factorToStatementsMap, factor, []);
    statements.push(stmtDoc._source);
    factorToStatementsMap[factor] = statements;
  };

  statementDocs.forEach((stmtDoc) => {
    _updateMap(stmtDoc._source.subj.factor, stmtDoc);
    _updateMap(stmtDoc._source.obj.factor, stmtDoc);
  });

  return factorToStatementsMap;
};

/**
 * The visible graph that was passed into WM Curation Service was already filtered for polarity. This is why we don't need to filter for polarity here.
 *
 * The assumption here is that there will only ever be one unique subj/factor/polarity tuple in the database.
 */
const _mapPolarityRecommendationsToStatements = async (
  projectId,
  statementIds,
  polarity,
  recommendations
) => {
  const statementDocs = await _getStatementsForPolarityRecommendations(
    projectId,
    statementIds,
    polarity,
    recommendations
  );
  if (_.isEmpty(statementDocs)) return [];
  const factorPairsToStatementsMap = _buildFactorPairsToStatmentsMap(statementDocs);

  const key = (r) => r.subj_factor + r.obj_factor;

  recommendations = recommendations.filter(
    (r) => key(r) in factorPairsToStatementsMap && factorPairsToStatementsMap[key(r)].length > 0
  );
  recommendations = recommendations.map((r) => {
    return {
      statements: factorPairsToStatementsMap[key(r)],
      score: r.score,
    };
  });
  recommendations.sort((r1, r2) => {
    return r1.score - r2.score; // Sort ascending
  });
  return recommendations;
};

const _getStatementsForPolarityRecommendations = async (
  projectId,
  statementIds,
  polarity,
  recommendations
) => {
  const client = ES.client;
  const response = await client.search({
    index: projectId,
    body: {
      size: SEARCH_LIMIT,
      _source: {
        includes: statementIncludes,
      },
      query: {
        bool: {
          filter: [
            { terms: { id: statementIds } },
            { term: { 'wm.statement_polarity': polarity } },
          ],
          should: _.map(recommendations, (r) => {
            return {
              bool: {
                must: [
                  { term: { 'subj.factor.raw': r.subj_factor } },
                  { term: { 'obj.factor.raw': r.obj_factor } },
                ],
              },
            };
          }),
          minimum_should_match: 1,
        },
      },
    },
  });
  const statementDocs = response.body.hits.hits;
  return statementDocs;
};

const _buildFactorPairsToStatmentsMap = (statementDocs) => {
  const factorPairsToStatementsMap = {};

  statementDocs.forEach((stmtDoc) => {
    const mapKey = stmtDoc._source.subj.factor + stmtDoc._source.obj.factor;
    const statements = _.get(factorPairsToStatementsMap, mapKey, []);
    statements.push(stmtDoc._source);
    factorPairsToStatementsMap[mapKey] = statements;
  });

  return factorPairsToStatementsMap;
};

const _mapEmptyEdgeRecommendationsToStatements = async (projectId, recommendations) => {
  const statementIds = recommendations.map((r) => r.id);
  const statementIdToScoreMap = {};
  recommendations.forEach((r) => {
    statementIdToScoreMap[r.id] = r.score;
  });

  let statements = await _getStatementsForEmptyEdgeRecommendations(projectId, statementIds);
  statements = statements.map((s) => {
    return {
      score: statementIdToScoreMap[s.id],
      statement: s,
    };
  });

  return statements;
};

const _getStatementsForEmptyEdgeRecommendations = async (projectId, statementIds) => {
  const statement = Adapter.get(RESOURCE.STATEMENT, projectId);
  const response = await statement.find(
    {
      clauses: [{ field: 'id', values: statementIds, isNot: false, operand: 'AND' }],
    },
    { size: SEARCH_LIMIT, includes: statementIncludes }
  );

  return response;
};

module.exports = {
  getFactorRecommendations,
  getPolarityRecommendations,
  getEmptyEdgeRecommendations,
  getSimilarConcepts,
  trackCuration,
};
