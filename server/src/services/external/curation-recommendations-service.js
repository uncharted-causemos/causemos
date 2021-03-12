const _ = require('lodash');
const requestAsPromise = rootRequire('/util/request-as-promise');
const ES = rootRequire('adapters/es/client');
const { Adapter, RESOURCE, SEARCH_LIMIT } = rootRequire('adapters/es/adapter');
const Logger = rootRequire('/config/logger');
const cache = rootRequire('/cache/node-lru-cache');

const headers = {
  'Content-type': 'application/json',
  'Accept': 'application/json'
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
  'evidence.document_context.publisher_name'
];

/**
 * Get recommendation for a factor-regrounding operation
 *
 * @param {string} projectId - project identifier
 * @arapm {array} statementIds - list of statement identifiers that compose the "visible-graph"
 * @param {string} factor - factor text
 * @param {number} numRecommendations
 */
const getFactorRecommendations = async (projectId, statementIds, factor, numRecommendations) => {
  Logger.info(`Factor recommendation: Project=${projectId}, Factor=${factor}, ${statementIds.length} statements,`);
  const payload = {
    knowledge_base_id: cache.get(projectId).kb_id,
    factor,
    num_recommendations: numRecommendations
  };
  const options = {
    url: process.env.WM_CURATION_SERVICE_URL + '/recommendation/' + projectId + '/regrounding',
    method: 'POST',
    headers: headers,
    json: payload
  };
  const result = await requestAsPromise(options);
  result.recommendations = await _mapRegroundingRecommendationsToStatementIds(projectId, statementIds, result.recommendations);
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
const getPolarityRecommendations = async (projectId, statementIds, subjFactor, objFactor, polarity, numRecommendations) => {
  Logger.info(`Polarity recommendation: Project=${projectId}, Subj=${subjFactor}, Obj=${objFactor}, Polarity=${polarity},  ${statementIds.length} statements,`);
  const payload = {
    knowledge_base_id: cache.get(projectId).kb_id,
    subj_factor: subjFactor,
    obj_factor: objFactor,
    num_recommendations: numRecommendations
  };

  const options = {
    url: process.env.WM_CURATION_SERVICE_URL + '/recommendation/' + projectId + '/polarity',
    method: 'POST',
    headers: headers,
    json: payload
  };
  const result = await requestAsPromise(options);
  result.recommendations = await _mapPolarityRecommendationsToStatements(projectId, statementIds, polarity, result.recommendations);
  return result;
};

/**
 * Get recommendation for an empty edge
 *
 * @param {string} projectId - project identifier
 * @param {number} numRecommendations
 */
const getEmptyEdgeRecommendations = async(projectId, subjConcept, objConcept, numRecommendations) => {
  Logger.info(`Polarity recommendation: Project=${projectId}`);
  const payload = {
    subj_concept: subjConcept,
    obj_concept: objConcept,
    num_recommendations: numRecommendations
  };

  const options = {
    url: process.env.WM_CURATION_SERVICE_URL + '/recommendation/' + projectId + '/edge-regrounding',
    method: 'POST',
    headers: headers,
    json: payload
  };
  const result = await requestAsPromise(options);
  result.recommendations = await _mapEmptyEdgeRecommendationsToStatements(projectId, result.recommendations);
  return result;
};

const _mapRegroundingRecommendationsToStatementIds = async (projectId, statementIds, recommendations) => {
  const statementDocs = await _getStatementsForRegroundingRecommendations(projectId, statementIds, recommendations);
  if (_.isEmpty(statementDocs)) return [];
  const factorToStatementsMap = _buildFactorsToStatmentsMap(statementDocs);
  recommendations = recommendations.filter(r => r.factor in factorToStatementsMap && factorToStatementsMap[r.factor].length > 0);
  recommendations = recommendations.map(r => {
    return {
      statements: factorToStatementsMap[r.factor],
      factor: r.factor,
      score: r.score
    };
  });
  return recommendations;
};

const _getStatementsForRegroundingRecommendations = async (projectId, statementIds, recommendations) => {
  const factors = recommendations.map(r => r.factor);
  const client = ES.client;
  const response = await client.search({
    index: projectId,
    body: {
      size: SEARCH_LIMIT,
      _source: {
        includes: statementIncludes
      },
      query: {
        bool: {
          filter: {
            terms: { id: statementIds }
          },
          should: [
            { terms: { 'subj.factor': factors } },
            { terms: { 'obj.factor': factors } }
          ],
          minimum_should_match: 1
        }
      }
    }
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

  statementDocs.forEach(stmtDoc => {
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
const _mapPolarityRecommendationsToStatements = async (projectId, statementIds, polarity, recommendations) => {
  const statementDocs = await _getStatementsForPolarityRecommendations(projectId, statementIds, polarity, recommendations);
  if (_.isEmpty(statementDocs)) return [];
  const factorPairsToStatementsMap = _buildFactorPairsToStatmentsMap(statementDocs);

  const key = (r) => r.subj_factor + r.obj_factor;

  recommendations = recommendations.filter(r => key(r) in factorPairsToStatementsMap && factorPairsToStatementsMap[key(r)].length > 0);
  recommendations = recommendations.map(r => {
    return {
      statements: factorPairsToStatementsMap[key(r)],
      score: r.score
    };
  });
  return recommendations;
};

const _getStatementsForPolarityRecommendations = async (projectId, statementIds, polarity, recommendations) => {
  const client = ES.client;
  const response = await client.search({
    index: projectId,
    body: {
      size: SEARCH_LIMIT,
      _source: {
        includes: statementIncludes
      },
      query: {
        bool: {
          filter: [
            { terms: { id: statementIds } },
            { term: { 'wm.statement_polarity': polarity } }
          ],
          should: _.map(recommendations, r => {
            return {
              bool: {
                must: [
                  { term: { 'subj.factor': r.subj_factor } },
                  { term: { 'obj.factor': r.obj_factor } }
                ]
              }
            };
          }),
          minimum_should_match: 1
        }
      }
    }
  });
  const statementDocs = response.body.hits.hits;
  return statementDocs;
};


const _buildFactorPairsToStatmentsMap = (statementDocs) => {
  const factorPairsToStatementsMap = {};

  statementDocs.forEach(stmtDoc => {
    const mapKey = stmtDoc._source.subj.factor + stmtDoc._source.obj.factor;
    const statements = _.get(factorPairsToStatementsMap, mapKey, []);
    statements.push(stmtDoc._source);
    factorPairsToStatementsMap[mapKey] = statements;
  });

  return factorPairsToStatementsMap;
};

const _mapEmptyEdgeRecommendationsToStatements = async(projectId, recommendations) => {
  const statementIds = recommendations.map(r => r.id);
  const statementIdToScoreMap = {};
  recommendations.forEach(r => {
    statementIdToScoreMap[r.id] = r.score;
  });

  let statements = await _getStatementsForEmptyEdgeRecommendations(projectId, statementIds);
  statements = statements.map(s => {
    return {
      score: statementIdToScoreMap[s.id],
      statement: s
    };
  });

  return statements;
};

const _getStatementsForEmptyEdgeRecommendations = async(projectId, statementIds) => {
  const statement = Adapter.get(RESOURCE.STATEMENT, projectId);
  const response = await statement.find({
    clauses: [
      { field: 'id', values: statementIds, isNot: false, operand: 'AND' }
    ]
  }, { size: SEARCH_LIMIT, includes: statementIncludes });

  return response;
};

module.exports = {
  getFactorRecommendations,
  getPolarityRecommendations,
  getEmptyEdgeRecommendations
};

