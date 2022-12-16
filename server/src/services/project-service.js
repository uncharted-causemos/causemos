const _ = require('lodash');
const yaml = require('js-yaml');
const { v4: uuid } = require('uuid');

const Logger = rootRequire('/config/logger');
const { Adapter, RESOURCE, SEARCH_LIMIT, MAX_ES_BUCKET_SIZE } = rootRequire('adapters/es/adapter');
const indraService = rootRequire('/services/external/indra-service');
const conceptAlignerService = rootRequire('/services/external/concept-aligner-service');

const requestAsPromise = rootRequire('/util/request-as-promise');
const { StatementQueryUtil } = rootRequire('adapters/es/statement-query-util');
const conceptUtil = rootRequire('/util/concept-util');
const graphUtil = rootRequire('/util/graph-util');
const {
  NODE_AGGREGATION_QUERY,
  EDGE_AGGREGATION_QUERY,
  formatNodeAggregation,
  formatEdgeAggregation
} = rootRequire('adapters/es/graph-query-util');
const { setCache, delCache, getCache } = rootRequire('/cache/node-lru-cache');

const MAX_NUMBER_PROJECTS = 100;

const INCREMENTAL_ASSEMBLY_FLOW_ID = '90a09440-e504-4db9-ad89-9db370933c8b';

const queryUtil = new StatementQueryUtil();

const dartService = rootRequire('/services/external/dart-service');

/**
 * Returns projects summary
 */
const listProjects = async () => {
  const project = Adapter.get(RESOURCE.PROJECT);
  return project.find({}, {
    size: MAX_NUMBER_PROJECTS,
    sort: { modified_at: { order: 'desc' } }
  });
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
 * @param {string} description - description of the project
 */
const createProject = async (kbId, name, description) => {
  const projectAdapter = Adapter.get(RESOURCE.PROJECT);
  const result = await projectAdapter.clone(kbId, name, description);
  const projectId = result.index;

  // Create an extension entry to house new project specific documents
  const projectExtension = Adapter.get(RESOURCE.PROJECT_EXTENSION);
  await projectExtension.insert([
    {
      project_id: projectId,
      document: []
    }
  ], () => projectId);

  const projectData = await projectAdapter.findOne([{ field: 'id', value: projectId }], {});

  Logger.info(`Caching Project data for ${projectId}`);
  setCache(projectId, {
    ...projectData
  });
  return result;
};

/**
 * Updates a project info
 *
 * @param {string} projectId - project id
 * @param {object} projectFields - project fields
 */
const updateProject = async (projectId, projectFields) => {
  const project = Adapter.get(RESOURCE.PROJECT);

  const keyFn = (doc) => {
    return doc.id;
  };

  const results = await project.update({
    id: projectId,
    ...projectFields
  }, keyFn);

  if (results.errors) {
    throw new Error(JSON.stringify(results.items[0]));
  }

  return results;
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
 * - project metadata
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
  const scenarioResultAdpater = Adapter.get(RESOURCE.SCENARIO_RESULT);
  const sensitivityAdapter = Adapter.get(RESOURCE.SENSITIVITY_RESULT);

  // misc
  const insightAdapter = Adapter.get(RESOURCE.INSIGHT);
  const questionAdapter = Adapter.get(RESOURCE.QUESTION);
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
    Logger.info(`Removing scenario results with model id: ${modelId}`);
    response = await scenarioResultAdpater.remove([{ field: 'model_id', value: modelId }]);
    Logger.info(JSON.stringify(response));
    Logger.info(`Removing sensitivity results with model id: ${modelId}`);
    response = await sensitivityAdapter.remove([{ field: 'model_id', value: modelId }]);
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

  // Remove project's insights
  Logger.info(`Deleting ${projectId} insights`);
  response = await insightAdapter.remove([{ field: 'project_id', value: projectId }]);
  Logger.info(JSON.stringify(response));

  // Remove project's questions
  Logger.info(`Deleting ${projectId} questions`);
  response = await questionAdapter.remove([{ field: 'project_id', value: projectId }]);
  Logger.info(JSON.stringify(response));

  // Remove project's ontologies
  Logger.info(`Deleting ${projectId} ontologies`);
  response = await ontologyAdapter.remove([{ field: 'project_id', value: projectId }]);
  Logger.info(JSON.stringify(response));

  // Remove project extension
  Logger.info(`Deleting ${projectId} extensions`);
  const projectExtension = Adapter.get(RESOURCE.PROJECT_EXTENSION);
  response = await projectExtension.remove([{ field: 'project_id', value: projectId }]);
  Logger.info(JSON.stringify(response));

  // Delete project data
  Logger.info(`Deleting ${projectId} index data`);
  response = await projectAdapter.client.indices.delete({
    index: projectId
  });
  Logger.info(JSON.stringify(response));

  // Remove deleted project from cache
  delCache(projectId);
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

  const statementFacets = await statement.getFacets(filters, fields);
  const documentContextFacets = await documentContext.getFacets(filters, fields);

  return {
    ...statementFacets,
    ...documentContextFacets
  };
};

/**
 * Retrieves a map of concept => definitions for a given project
 * @param {string} projectId - project identifier
 */
const getOntologyDefinitions = async (projectId) => {
  const MAX_SIZE = 5000;
  const ontology = Adapter.get(RESOURCE.ONTOLOGY);

  const ontologyConcepts = await ontology.find([
    { field: 'project_id', value: projectId }
  ], { size: MAX_SIZE });

  const result = {};
  ontologyConcepts.forEach(concept => {
    result[concept.label] = concept.definition;
  });
  return result;
};


/**
 * Retrieves the candidate scoring portions of a set of INDRA statements
 *
 * @param {string} projectId - project identifier
 * @param {array} ids - list of statement identifiers
 */
const getProjectStatementsScores = async (projectId, ids) => {
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

const getProjectEdgesByPartition = async (projectId, filters, totalPartitions, partition) => {
  const statement = Adapter.get(RESOURCE.STATEMENT, projectId);
  const filterQuery = queryUtil.buildQuery(filters);
  // Filter statements and retrieve by unique edge ids
  const result = await statement.client.search({
    index: statement.index,
    body: {
      size: 0,
      query: filterQuery.query,
      aggs: {
        edgePartitions: {
          terms: {
            field: 'wm.edge',
            include: {
              partition: partition,
              num_partitions: totalPartitions
            },
            size: MAX_ES_BUCKET_SIZE
          }
        }
      }
    }
  });

  // tranform to simple edge format (source and target)
  const statementEdges = result.body.aggregations.edgePartitions.buckets;
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
 * Retrieve statements and transform them to edge like format
 *
 * @param {string} projectId  - project identifier
 * @param {object} filters    - statement filters
 */
const getProjectEdges = async (projectId, filters) => {
  const totalPartitions = 50;
  const partitionsOfEdges = (await Promise.all([...Array(totalPartitions).keys()].map(partition =>
    getProjectEdgesByPartition(projectId, filters, totalPartitions, partition)
  )));
  return partitionsOfEdges.flat();
};

/**
 * Search various fields in ES for terms starting with the queryString
 *
 */
const searchFields = async (projectId, searchField, queryString, defaultOperator = 'AND') => {
  const statement = Adapter.get(RESOURCE.STATEMENT, projectId);
  const matchedTerms = await statement.searchFields(projectId, searchField, queryString, defaultOperator);
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
  promise = getCache(_graphKey(projectId));

  if (!promise) {
    promise = getProjectEdges(projectId, null);
    setCache(_graphKey(projectId), promise);
  }
  const g = await promise;
  return graphUtil.normalPath(g, [sourceConcept, targetConcept], hops);
};

/**
 * @param {string} projectId
 * @param {string} sourceConcept
 * @param {string} targetConcept
 * @param {number} hops
 */
const groupSearchPath = async (projectId, sourceConcepts, targetConcepts, hops) => {
  let promise = null;
  promise = getCache(_graphKey(projectId));

  if (!promise) {
    promise = getProjectEdges(projectId, null);
    setCache(_graphKey(projectId), promise);
  }
  const g = await promise;
  return graphUtil.groupPath(g, sourceConcepts, targetConcepts, hops);
};

const bustProjectGraphCache = async (projectId) => {
  Logger.info(`Busting/reset project ${projectId} graph cache`);
  const promise = getProjectEdges(projectId, null);
  setCache(_graphKey(projectId), promise);
};


/**
 * Given a flattened concept, search the statements and return
 * the viable themes/process/properties in the compositional ontology.
 */
const ontologyComposition = async (projectId, concept) => {
  const statement = Adapter.get(RESOURCE.STATEMENT, projectId);

  // FIXME: Move to adapter
  const result = await statement.client.search({
    index: statement.index,
    body: {
      size: 1,
      query: {
        bool: {
          should: [
            {
              term: {
                'subj.candidates.name': concept
              }
            },
            {
              term: {
                'obj.candidates.name': concept
              }
            }
          ]
        }
      }
    }
  });

  if (_.isEmpty(result.body.hits.hits)) {
    return {};
  }
  const st = result.body.hits.hits[0]._source;
  const candidate = st.subj.candidates.filter(d => d.name === concept).concat(
    st.obj.candidates.filter(d => d.name === concept)
  )[0];

  return {
    theme: candidate.theme,
    theme_property: candidate.theme_property,
    process: candidate.process,
    process_property: candidate.process_property
  };
};


/**
 * For incremental assembly
 * - Create an entry with selected (document, reader)
 * - Update project timestamp
 */
const addReaderOutput = async (projectId, records, timestamp) => {
  const assemblyRequest = Adapter.get(RESOURCE.ASSEMBLY_REQUEST);
  const project = Adapter.get(RESOURCE.PROJECT);

  // create new records
  const id = uuid();
  await assemblyRequest.insert([
    {
      id,
      created_at: (new Date()).getTime(),
      project_id: projectId,
      records: records
    }
  ], d => d.id);


  // Update last updated time
  await project.update([
    {
      id: projectId,
      extended_at: +timestamp
    }
  ], d => d.id);

  return id;
};

/**
 * Trigger a Prefect flow to:
 *  - Take the reader output records associated with this assemblyRequestId
 *  - Send them to INDRA for reassembly
 *  - Transform and insert/update the resulting statements into the project
 *  - associated with this assemblyRequestId
 *
 * @param {String} assemblyRequestId - ID for a doc in the project-extension ES index
 */
const requestAssembly = async (assemblyRequestId) => {
  Logger.info(`Requesting new incremental assembly for extension "${assemblyRequestId}" `);
  if (!assemblyRequestId) {
    Logger.error('Required ID for incremental assembly request was not provided.');
    return;
  }

  const runName = `requestAssembly-${assemblyRequestId}`;
  const flowParameters = {
    ASSEMBLY_REQUEST_ID: assemblyRequestId
  };


  // We can either run through Prefect or with Anansi web-service
  if (process.env.WM_ANANSI_URL && process.env.WM_ANANSI_URL.length) {
    const anansiOption = {
      method: 'POST',
      url: process.env.WM_ANANSI_URL,
      headers: {
        'Content-type': 'application/json',
        'Accept': 'application/json'
      },
      json: {
        id: assemblyRequestId
      }
    };
    const result = await requestAsPromise(anansiOption);
    return result;
  }

  // We need the two JSON.stringify below to go from
  // JSON object -> JSON string -> escaped JSON string
  const graphQLQuery = `
    mutation {
      create_flow_run(input: {
        version_group_id: "${INCREMENTAL_ASSEMBLY_FLOW_ID}",
        flow_run_name: "${runName}",
        parameters: ${JSON.stringify(JSON.stringify(flowParameters))}
      }) {
        id
      }
    }
  `;

  const pipelinePayload = {
    method: 'POST',
    url: process.env.WM_PIPELINE_URL,
    headers: {
      'Content-type': 'application/json',
      'Accept': 'application/json'
    },
    json: {
      query: graphQLQuery
    }
  };

  const result = await requestAsPromise(pipelinePayload);
  return result;
};

/**
 * Push new documents (id/name pairs) into project tracker
 *
 * @param {string} projectId
 * @param {array} docs  [ {name, id}, {name, id} ... ]
 */
const extendProject = async (projectId, docs) => {
  const projectExtension = Adapter.get(RESOURCE.PROJECT_EXTENSION);
  const client = projectExtension.client;

  await client.update({
    index: RESOURCE.PROJECT_EXTENSION,
    id: projectId,
    body: {
      script: {
        lang: 'painless',
        inline: 'ctx._source.document.addAll(params.docs); ctx._source.modified_at = params.timestamp',
        params: { docs, timestamp: Date.now() }
      }
    }
  });
};


/**
 * Parse compositional ontology metadata
 *
 * See https://github.com/WorldModelers/Ontologies/blob/master/CompositionalOntology_metadata.yml
 */
const parseOntology = async (url) => {
  const options = { url: url, method: 'GET' };
  const response = await requestAsPromise(options);
  const ontology = yaml.safeLoad(response);
  const metadata = {};
  if (_.isArray(ontology)) {
    for (let i = 0; i < ontology.length; i++) {
      conceptUtil.extractOntologyMetadata(metadata, ontology[i].node, '');
    }
  } else {
    // FIXME: Deprecated with https://github.com/WorldModelers/Ontologies/pull/154
    conceptUtil.extractOntologyMetadata(metadata, ontology.node, '');
  }
  return metadata;
};


module.exports = {
  listProjects,
  findProject,
  createProject,
  checkIndexStatus,
  deleteProject,
  updateProject,

  findProjectStatements,
  findProjectStatementsByEdges,
  findProjectGraph,
  findProjectDocuments,
  findProjectLocations,

  countStats,
  facets,
  getOntologyDefinitions,

  getProjectStatementsScores,
  getProjectEdges,

  groupSearchPath,
  searchFields,
  searchPath,
  bustProjectGraphCache,

  // incremental assembly
  addReaderOutput,
  requestAssembly,
  extendProject,

  // misc
  ontologyComposition,
  parseOntology
};
