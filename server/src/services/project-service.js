const _ = require('lodash');
const yaml = require('js-yaml');
const uuid = require('uuid');

const Logger = rootRequire('/config/logger');
const { Adapter, RESOURCE, SEARCH_LIMIT, MAX_ES_BUCKET_SIZE } = rootRequire('adapters/es/adapter');

const requestAsPromise = rootRequire('/util/request-as-promise');
const queryUtil = rootRequire('adapters/es/query-util');
const conceptUtil = rootRequire('/util/concept-util');
const graphUtil = rootRequire('/util/graph-util');
const {
  NODE_AGGREGATION_QUERY,
  EDGE_AGGREGATION_QUERY,
  formatNodeAggregation,
  formatEdgeAggregation
} = rootRequire('adapters/es/graph-query-util');
const { set, del, get } = rootRequire('/cache/node-lru-cache');

const MAX_NUMBER_PROJECTS = 100;

/**
 * Returns projects summary
 */
const listProjects = async () => {
  const project = Adapter.get(RESOURCE.PROJECT);
  return project.find({}, { size: MAX_NUMBER_PROJECTS });
};


/**
 * Returns a specified project
 */
const findProject = async (projectId) => {
  const project = Adapter.get(RESOURCE.PROJECT);
  return project.findOne([{ field: 'id', value: projectId }], {});
};


/**
 * Creates the metadata and invokes cloning.
 * Note this will return immedately with the new index identifier, but
 * it does not the index is ready yet. We need to "checkIndexStatus" to
 * ensure the index is green, before proceeding to use the index data.
 *
 * @param {string} kbId - the index to clone from
 * @param {string} name - the human-friendly new index name
 */
const createProject = async (kbId, name) => {
  const projectAdapter = Adapter.get(RESOURCE.PROJECT);
  const result = await projectAdapter.clone(kbId, name);
  const projectId = result.index;

  // Ontology
  const projectData = await projectAdapter.findOne([{ field: 'id', value: projectId }], {});
  const options = {
    url: projectData.ontology,
    method: 'GET'
  };
  const response = await requestAsPromise(options);

  // Need to set the project in the cache
  Logger.info(`Caching Project data for ${projectId}`);
  set(projectId, {
    ...projectData,
    stat: {
      model_count: 0,
      data_analysis_count: 0
    }
  });

  Logger.info(`Cached ${projectId}`);

  Logger.info(`Processing ontology ${projectData.ontology}`);
  const processed = yaml.safeLoad(response);
  const examples = {};
  processed.forEach(conceptObj => {
    conceptUtil.extractConceptExamples(examples, conceptObj, '');
  });

  const conceptsPayload = Object.keys(examples).map(key => {
    return {
      project_id: projectId,
      id: uuid(),
      label: key,
      examples: examples[key]
    };
  });
  const ontologyAdapter = Adapter.get(RESOURCE.ONTOLOGY);
  await ontologyAdapter.insert(conceptsPayload, d => d.id);
  return result;
};

/**
 * Check health, used to check index is ready after cloning
 */
const checkIndexStatus = async (projectId) => {
  const project = Adapter.get(RESOURCE.PROJECT);
  const r = await project.health(projectId);
  return r;
};


/**
 * Cascade deletion of project and its resources
 * - model metadata
 * - edge
 * - node
 * - project metadat
 * - project
 *
 * @param {string} projectId - project identifier
 */
const deleteProject = async (projectId) => {
  Logger.info('Deleting project');
  let response = null;

  const projectAdapter = Adapter.get(RESOURCE.PROJECT);
  // model related
  const modelAdapter = Adapter.get(RESOURCE.MODEL);
  const analysisAdapter = Adapter.get(RESOURCE.ANALYSIS);
  const nodeAdapter = Adapter.get(RESOURCE.NODE_PARAMETER);
  const edgeAdapter = Adapter.get(RESOURCE.EDGE_PARAMETER);
  const scenarioAdapter = Adapter.get(RESOURCE.SCENARIO);
  // misc
  const bookmarkAdapter = Adapter.get(RESOURCE.BOOKMARK);
  const ontologyAdapter = Adapter.get(RESOURCE.ONTOLOGY);

  const models = await modelAdapter.find([{ field: 'project_id', value: projectId }], {});

  Logger.info(`Removing ${models.length} models`);
  for (let i = 0; i < models.length; i++) {
    const modelId = models[i].id;
    Logger.info(`Removing CAG nodes with model id: ${modelId}`);
    response = await nodeAdapter.remove([{ field: 'model_id', value: modelId }]);
    Logger.info(JSON.stringify(response));
    Logger.info(`Removing CAG edges with model id: ${modelId}`);
    response = await edgeAdapter.remove([{ field: 'model_id', value: modelId }]);
    Logger.info(JSON.stringify(response));
    Logger.info(`Removing scenario with model id: ${modelId}`);
    response = await scenarioAdapter.remove([{ field: 'model_id', value: modelId }]);
    Logger.info(JSON.stringify(response));
    Logger.info(`Removing model with id: ${modelId}`);
    response = await modelAdapter.remove([{ field: 'id', value: modelId }]);
    Logger.info(JSON.stringify(response));
  }

  // Clean up project entry
  Logger.info(`Deleting ${projectId} metadata`);
  response = await projectAdapter.remove([{ field: 'id', value: projectId }]);
  Logger.info(JSON.stringify(response));

  // Clean up analysis
  Logger.info(`Deleting ${projectId} analyses`);
  response = await analysisAdapter.remove([{ field: 'project_id', value: projectId }]);
  Logger.info(JSON.stringify(response));

  // Remove project's bookmarks
  Logger.info(`Deleting ${projectId} bookmarks`);
  response = await bookmarkAdapter.remove([{ field: 'project_id', value: projectId }]);
  Logger.info(JSON.stringify(response));

  // Remove project's ontologies
  Logger.info(`Deleting ${projectId} ontologies`);
  response = await ontologyAdapter.remove([{ field: 'project_id', value: projectId }]);
  Logger.info(JSON.stringify(response));

  // Delete project data
  Logger.info(`Deleting ${projectId} index data`);
  response = await projectAdapter.client.indices.delete({
    index: projectId
  });
  Logger.info(JSON.stringify(response));

  // Remove deleted project from cache
  del(projectId);
};


/**
 * Return tabular representation of the filters state
 * @param {string} projectId - id of project
 * @param {object} filters
 * @param {object} options
 * @param {number} options.from
 * @param {number} options.size.
 * @param {object} options.sort
 */
const findProjectStatements = async (projectId, filters, options) => {
  const statement = Adapter.get(RESOURCE.STATEMENT, projectId);

  // By default, hide rarely used fields
  const defaultExclusions = [];
  if (!options.withDocuments) {
    // FIXME: We do use doc_id, perhaps we need an ES "summary" section with just the IDs and none of the contexts
    defaultExclusions.push('evidence.document_context.publication_date');
    defaultExclusions.push('evidence.document_context.author');
    defaultExclusions.push('evidence.document_context.publisher_name');
    defaultExclusions.push('evidence.document_context.document_source');
  }

  // Things we probably never need
  defaultExclusions.push('evidence.document_context.ner_analytics');
  defaultExclusions.push('wm.readers_evidence_count');
  defaultExclusions.push('subj.candidates');
  defaultExclusions.push('obj.candidates');

  return statement.find(filters, {
    size: options.size,
    from: options.from,
    sort: options.sort,
    excludes: defaultExclusions
  });
};

/**
 * Return statements representation of the filters state and selected edges
 * @param {string} projectId - id of project
 * @param {object} filters
 * @param {array} edges
 */
const findProjectStatementsByEdges = async (projectId, filters, edges) => {
  const statement = Adapter.get(RESOURCE.STATEMENT, projectId);
  const filterQuery = queryUtil.buildQuery(filters);

  const formattedEdges = edges.map(edge => edge.source + '///' + edge.target);

  // 1) Execute ES aggregation query to group by wm.edge
  const result = await statement.client.search({
    index: statement.index,
    body: {
      size: 0,
      query: filterQuery.query,
      aggs: {
        edges: {
          terms: {
            field: 'wm.edge',
            size: MAX_ES_BUCKET_SIZE,
            include: formattedEdges
          },
          aggs: {
            ids: {
              terms: {
                field: 'id',
                size: MAX_ES_BUCKET_SIZE
              }
            }
          }
        }
      }
    }
  });

  // 2) Format data
  const aggs = result.body.aggregations;
  const finalResult = {};
  aggs.edges.buckets.forEach(bucket => {
    finalResult[bucket.key] = bucket.ids.buckets.map(b => b.key);
  });

  return finalResult;
};



/**
 * Return graph representation of the filters state
 * @param {string} projectId - id of project
 * @param {object} filters
*/
const findProjectGraph = async (projectId, filters) => {
  const statement = Adapter.get(RESOURCE.STATEMENT, projectId);
  const filterQuery = queryUtil.buildQuery(filters);

  const graphEdges = await statement.client.search({
    index: statement.index,
    body: {
      size: 0,
      query: filterQuery.query,
      aggs: EDGE_AGGREGATION_QUERY.aggs
    }
  });
  const graphNodes = await statement.client.search({
    index: statement.index,
    body: {
      size: 0,
      query: filterQuery.query,
      aggs: NODE_AGGREGATION_QUERY.aggs
    }
  });

  return {
    nodes: formatNodeAggregation(graphNodes, graphEdges),
    edges: formatEdgeAggregation(graphEdges)
  };
};


/**
 * Return document representation of the filters state
 * @param {string} projectId - id of project
 * @param {object} filters
 * @param {object} options - pagination configs
*/
const findProjectDocuments = async (projectId, filters, options) => {
  const documentContext = Adapter.get(RESOURCE.DOCUMENT_CONTEXT, projectId);
  return documentContext.find(filters, {
    size: options.size,
    from: options.from
  });
};


/**
 * Return map/location representation of the filters state.
 * This combines both subject and object geo_locations and treat
 * them as a single unit.
 *
 * FIXME: We probably want to separate out subj/obj context, it doesn't
 * make a whole log of sense to count them together... - DC June 2020
 *
 * @param {string} projectId - id of project
 * @param {object} filters
*/
const findProjectLocations = async (projectId, filters) => {
  const statement = Adapter.get(RESOURCE.STATEMENT, projectId);
  const filterQuery = queryUtil.buildQuery(filters);

  const MAX_SIZE = 100;

  // 1) Execute ES aggregation query to group by subj and obj
  const result = await statement.client.search({
    index: statement.index,
    body: {
      size: 0,
      query: filterQuery.query,
      aggs: {
        subjLocations: {
          terms: {
            field: 'subj.geo_context.name',
            size: MAX_SIZE
          },
          aggs: {
            coordinate: {
              top_hits: {
                size: 1,
                _source: {
                  includes: ['subj.geo_context.location']
                }
              }
            }
          }
        },
        objLocations: {
          terms: {
            field: 'obj.geo_context.name',
            size: MAX_SIZE
          },
          aggs: {
            coordinate: {
              top_hits: {
                size: 1,
                _source: {
                  includes: ['obj.geo_context.location']
                }
              }
            }
          }
        }
      }
    }
  });

  // 2) Wrangle basic formatting and bad data
  const aggs = result.body.aggregations;
  const subjLocations = aggs.subjLocations.buckets.filter(d => {
    const src = d.coordinate.hits.hits[0]._source;
    return !_.isEmpty(src);
  });

  const objLocations = aggs.objLocations.buckets.filter(d => {
    const src = d.coordinate.hits.hits[0]._source;
    return !_.isEmpty(src);
  });

  const subjFormatted = subjLocations.map(d => {
    const src = d.coordinate.hits.hits[0]._source;
    return {
      name: d.key,
      count: d.doc_count,
      coords: src.subj.geo_context.location
    };
  });

  const objFormatted = objLocations.map(d => {
    const src = d.coordinate.hits.hits[0]._source;
    return {
      name: d.key,
      count: d.doc_count,
      coords: src.obj.geo_context.location
    };
  });

  // 3) Join subj and obj make make features array
  const grouped = _.groupBy([...subjFormatted, ...objFormatted], d => {
    return d.name;
  });

  const finalResult = [];
  Object.keys(grouped).forEach(key => {
    const coords = grouped[key][0].coords;
    finalResult.push({
      type: 'Feature',
      properties: {
        name: key,
        count: _.sum(grouped[key].map(d => d.count))
      },
      geometry: {
        type: 'Point',
        coordinates: [coords.lon, coords.lat]
      }
    });
  });

  // 4) Format to geojson
  return {
    geoJSON: {
      type: 'FeatureCollection',
      features: finalResult
    },
    maxCount: Math.max(...finalResult.map(d => d.properties.count)),
    minCount: Math.min(...finalResult.map(d => d.properties.count))
  };
};


const countStats = async (projectId, filters) => {
  const statement = Adapter.get(RESOURCE.STATEMENT, projectId);
  return statement.stats(filters);
};

/**
 * Returns field aggregations
 *
 * @param {string} projectId
 * @param {object} filters
 * @param {array} fields
 */
const facets = async (projectId, filters, fields) => {
  const statement = Adapter.get(RESOURCE.STATEMENT, projectId);
  const documentContext = Adapter.get(RESOURCE.DOCUMENT_CONTEXT, projectId);


  // FIXME: A bit awkward
  const statementFacets = await statement.getFacets(filters, fields);
  const documentContextFacets = await documentContext.getFacets(filters, fields);

  return {
    ...statementFacets,
    ...documentContextFacets
  };
};

/**
 * Retrieves a map of concept => examples for a given project
 * @param {string} projectId - project identifier
 */
const getOntologyExamples = async(projectId) => {
  const MAX_SIZE = 5000;
  const ontology = Adapter.get(RESOURCE.ONTOLOGY);

  const ontologyConcepts = await ontology.find([
    { field: 'project_id', value: projectId }
  ], { size: MAX_SIZE });

  const result = {};
  ontologyConcepts.forEach(concept => {
    result[concept.label] = concept.examples;
  });
  return result;
};


/**
 * Retrieves the candidate scoring portions of a set of INDRA statements
 *
 * @param {string} projectId - project identifier
 * @param {array} ids - list of statement identifiers
 */
const getProjectStatementsScores = async(projectId, ids) => {
  const statement = Adapter.get(RESOURCE.STATEMENT, projectId);

  if (ids.length > SEARCH_LIMIT) {
    throw new Error(`Score lookup of ${ids.length} statements exceeds search limit ${SEARCH_LIMIT}`);
  }

  const results = await statement.find({
    clauses: [
      { field: 'id', values: ids, operand: 'OR', isNot: 'false' }
    ]
  }, {
    size: ids.length,
    includes: [
      'id',
      'subj.candidates',
      'subj.factor',
      'obj.candidates',
      'obj.factor'
    ]
  });
  return results;
};


/**
 * Retrieve statements and transform them to edge like format
 *
 * @param {string} projectId  - project identifier
 * @param {object} filters    - statement filters
 */
const getProjectEdges = async(projectId, filters) => {
  const statement = Adapter.get(RESOURCE.STATEMENT, projectId);
  const filterQuery = queryUtil.buildQuery(filters);
  // Filter statements and retrieve by unique edge ids
  const result = await statement.client.search({
    index: statement.index,
    body: {
      size: 0,
      query: filterQuery.query,
      aggs: {
        edges: {
          terms: {
            field: 'wm.edge',
            size: MAX_ES_BUCKET_SIZE
          }
        }
      }
    }
  });

  // tranform to simple edge format (source and target)
  const statementEdges = result.body.aggregations.edges.buckets;
  const edges = statementEdges.map(s => {
    const [source, target] = s.key.split('///');
    return {
      source,
      target
    };
  });

  return edges;
};

/**
 * Search various fields in ES for terms starting with the queryString
 *
 */
const searchFields = async (projectId, searchField, queryString) => {
  const statement = Adapter.get(RESOURCE.STATEMENT, projectId);
  const matchedTerms = await statement.searchFields(projectId, searchField, queryString);
  return matchedTerms;
};


const _graphKey = (projectId) => 'graph-' + projectId;
/**
 * @param {string} projectId
 * @param {string} sourceConcept
 * @param {string} targetConcept
 * @param {number} hops
 */
const searchPath = async (projectId, sourceConcept, targetConcept, hops) => {
  let promise = null;
  promise = get(_graphKey(projectId));

  if (!promise) {
    promise = getProjectEdges(projectId, null);
    set(_graphKey(projectId), promise);
  }
  const g = await promise;
  return graphUtil.normalPath(g, [sourceConcept, targetConcept], hops);
};

const bustProjectGraphCache = async (projectId) => {
  Logger.info(`Busting/reset project ${projectId} graph cache`);
  const promise = getProjectEdges(projectId, null);
  set(_graphKey(projectId), promise);
};

module.exports = {
  listProjects,
  findProject,
  createProject,
  checkIndexStatus,
  deleteProject,

  findProjectStatements,
  findProjectStatementsByEdges,
  findProjectGraph,
  findProjectDocuments,
  findProjectLocations,

  countStats,
  facets,
  getOntologyExamples,

  getProjectStatementsScores,
  getProjectEdges,

  searchFields,
  searchPath,
  bustProjectGraphCache
};
