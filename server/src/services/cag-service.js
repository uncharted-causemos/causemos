const _ = require('lodash');
const moment = require('moment');
const uuid = require('uuid');
const Logger = rootRequire('/config/logger');

const { Adapter, RESOURCE, SEARCH_LIMIT } = rootRequire('/adapters/es/adapter');
const { client } = rootRequire('/adapters/es/client');

const { get, set } = rootRequire('/cache/node-lru-cache');

const modelUtil = rootRequire('/util/model-util');

// -------------- Helper Functions for Components of the CAG -----------------
/**
 * Create or Update a new Component(s)
 *
 * @param {string} modelId - model id
 * @param {string} resource - resource
 * @param {object} components - components
 */
const resolveComponents = async(modelId, resource, components) => {
  // If the components is an empty array return null
  if (_.isEmpty(components)) return null;

  // Ensure components is an array
  if (!_.isArray(components)) {
    components = [components];
  }

  Logger.info(`Adding ${components.length} ${resource} components to: ${modelId}`);
  const componentConnection = Adapter.get(resource);
  const keyFn = (doc) => {
    return doc.id;
  };

  const modifiedAt = moment().valueOf();
  const updateList = [];
  const indexList = [];

  components.forEach(component => {
    component.model_id = modelId;
    component.modified_at = modifiedAt;

    if (_.isNil(component.id)) {
      component.id = uuid();
      indexList.push(component);
    } else {
      updateList.push(component);
    }
  });

  let results = null;
  if (indexList.length > 0) {
    results = await componentConnection.insert(indexList, keyFn);
    if (results.errors) {
      throw new Error(JSON.stringify(results.items[0]));
    }
  }
  if (updateList.length > 0) {
    results = await componentConnection.update(updateList, keyFn);
    if (results.errors) {
      throw new Error(JSON.stringify(results.items[0]));
    }
  }
};

/**
 * Return all Components belonging to a Model
 *
 * @param{string} modelId - model id
 * @param{string} resource - resource
 */
const getAllComponents = async(modelId, resource) => {
  const connection = Adapter.get(resource);
  const results = await connection.find([{ field: 'model_id', value: modelId }], { size: SEARCH_LIMIT });
  return results;
};

/**
 * Delete a specified Component(s) or all Components
 *
 * @param{string} modelId - model id
 * @param{string} resource - resource
 * @param{array}  components - component ids
 */
const deleteComponents = async(modelId, resource, components) => {
  if (_.isEmpty(components)) return null;

  Logger.info(`Removing ${components.length} ${resource} component(s) from model: ` + modelId);
  const componentConnection = Adapter.get(resource);

  // Check to see if edges is an array
  if (!_.isArray(components)) {
    components = [components];
  }

  const results = await componentConnection.removeMany({ id: components.map(component => component.id) });
  if (!results.deleted) {
    throw new Error(`Unable to delete ${resource} of model: ${modelId}`);
  }

  Logger.info('Deleted Component(s)');
  return results;
};
// ---------------------------------------------------------------------------

const findOne = async (modelId) => {
  const connection = Adapter.get(RESOURCE.CAG);
  const modelData = await connection.findOne([{ field: 'id', value: modelId }], {});
  return modelData;
};

/**
 * Lists CAGs
 *
 * @param {object} projectId - it's nice when field names need no introduction
 * @param {object} size - number of cags returned
 * @param {object} from - offset for paginated results
 * @param {object} sort - results sort field - {field: order} object, eg [{field1: 'asc'}, {field2: 'desc'}]
 */
const listCAGs = async (projectId, size, from, sort) => {
  const connection = Adapter.get(RESOURCE.CAG);
  if (_.isNil(size)) size = 20;
  if (_.isNil(sort)) sort = { modified_at: 'desc' };
  return connection.find([{ field: 'project_id', value: projectId }], { size, from, sort });
};

/**
 * Wrapper to create a new CAG
 *
 * @param {object} modelFields - model fields
 * @param {array}  edges - edges
 * @param {array}  nodes - nodes
 */
const createCAG = async (modelFields, edges, nodes) => {
  const CAGId = uuid();
  Logger.info('Creating CAG entry: ' + CAGId);
  const CAGConnection = Adapter.get(RESOURCE.CAG);
  const keyFn = (doc) => {
    return doc.id;
  };
  const now = moment().valueOf();
  const results = await CAGConnection.insert({
    id: CAGId,
    ...modelFields,
    is_stale: false,
    is_quantified: false,
    is_synced: false,
    created_at: now,
    modified_at: now
  }, keyFn);

  if (results.errors) {
    throw new Error(JSON.stringify(results.items[0]));
  }

  // Add edges and nodes to the CAG
  await resolveComponents(CAGId, RESOURCE.EDGE_PARAMETER, edges);
  await resolveComponents(CAGId, RESOURCE.NODE_PARAMETER, nodes);

  // Update CAG/model count in cache
  const projectId = modelFields.project_id;
  const projectCache = get(projectId);
  projectCache.stat.model_count += 1;
  set(projectId, projectCache);

  // Acknowledge success
  return {
    id: CAGId
  };
};

/**
 * Updates a CAGs metadata
 *
 * @param {string} modelId - model id
 * @param {object} modelFields - model fields
 */
const updateCAGMetadata = async(modelId, modelFields) => {
  const CAGConnection = Adapter.get(RESOURCE.CAG);
  const keyFn = (doc) => {
    return doc.id;
  };

  const results = await CAGConnection.update({
    id: modelId,
    modified_at: moment().valueOf(),
    ...modelFields
  }, keyFn);

  if (results.errors) {
    throw new Error(JSON.stringify(results.items[0]));
  }

  return results;
};


/**
 * Returns the underlying components (node/edges) of a given model
 *
 * @param {string} modelId - model id
 */
const getComponents = async(modelId) => {
  // Get the CAG Metadata, if there is no CAG with the given ID, then
  // throw an error
  const connection = Adapter.get(RESOURCE.CAG);
  const modelData = await connection.findOne([{ field: 'id', value: modelId }], {});
  if (modelData === null) {
    throw new Error(`No model found with id: ${modelId}`);
  }

  // Connection to the project we will be querying
  const projectAdapter = Adapter.get(RESOURCE.STATEMENT, modelData.project_id);

  // Get Edges and calculate underlying statement polarities as well
  // i.e: same, opposite, and unknown
  const edges = await getAllComponents(modelId, RESOURCE.EDGE_PARAMETER);
  edges.sort((a, b) => a.id.localeCompare(b.id));

  const augmentedEdges = await Promise.all(edges.map(async edge => {
    if (_.isEmpty(edge.reference_ids)) {
      edge.same = 0;
      edge.opposite = 0;
      edge.unknown = 0;
      edge.belief_score = 1;
    } else {
      const statements = await projectAdapter.find({
        clauses: [
          {
            field: 'id',
            operand: 'or',
            isNot: false,
            values: edge.reference_ids
          }
        ]
      }, { size: SEARCH_LIMIT, includes: ['wm.statement_polarity', 'belief'] });

      let belief = 0;
      let same = 0;
      let opposite = 0;
      let unknown = 0;
      statements.forEach(s => {
        const polarity = s.wm.statement_polarity;
        if (polarity === 1) {
          same++;
        } else if (polarity === -1) {
          opposite++;
        } else {
          unknown++;
        }
        belief += s.belief;
      });
      edge.same = same;
      edge.opposite = opposite;
      edge.unknown = unknown;
      edge.belief_score = belief / statements.length;
    }

    if (!_.isNil(edge.user_polarity)) edge.polarity = edge.user_polarity;
    else if (edge.same > 0 && edge.opposite === 0) edge.polarity = 1;
    else if (edge.opposite > 0 && edge.same === 0) edge.polarity = -1;
    else edge.polarity = 0;

    return edge;
  }));

  const nodes = await getAllComponents(modelId, RESOURCE.NODE_PARAMETER);
  nodes.sort((a, b) => a.id.localeCompare(b.id));

  return {
    ...modelData,
    nodes: nodes,
    edges: augmentedEdges
  };
};

/**
 * Updates nodes/edges in the CAG
 *
 * @param {string} modelId - model id
 * @param {array}  edges - edges
 * @param {array}  nodes - nodes
 */
const updateCAG = async(modelId, edges, nodes) => {
  // Add edges and nodes to the CAG
  await resolveComponents(modelId, RESOURCE.EDGE_PARAMETER, edges);
  await resolveComponents(modelId, RESOURCE.NODE_PARAMETER, nodes);

  // Mark model as unsynced
  const CAGConnection = Adapter.get(RESOURCE.CAG);
  const results = await CAGConnection.update({
    id: modelId,
    is_synced: false,
    modified_at: moment().valueOf()
  }, d => d.id);
  if (results.errors) {
    throw new Error(JSON.stringify(results.items[0]));
  }

  return {
    id: results.id
  };
};

/**
 * Removes selected edges and nodes from the CAG
 *
 * @param{string} modelId - model id
 * @param{array}  edges - array of edge ids
 * @param{array}  nodes - array of node ids
 */
const pruneCAG = async(modelId, edges, nodes) => {
  // Remove specified edges and nodes
  const edgeResults = await deleteComponents(modelId, RESOURCE.EDGE_PARAMETER, edges);
  const nodeResults = await deleteComponents(modelId, RESOURCE.NODE_PARAMETER, nodes);

  // Mark model as unsynced
  const CAGConnection = Adapter.get(RESOURCE.CAG);
  const results = await CAGConnection.update({
    id: modelId,
    is_synced: false,
    modified_at: moment().valueOf()
  }, d => d.id);
  if (results.errors) {
    throw new Error(JSON.stringify(results.items[0]));
  }


  return {
    id: modelId,
    edges: edgeResults,
    nodes: nodeResults
  };
};

/**
 * Deletes a CAG and its resources
 *
 * @param {string} modelId - model id
 */
const deleteCAG = async(modelId) => {
  Logger.info('Deleting CAG: ' + modelId);
  // Attempt to delete the CAG with the specified modelId, if results are null
  // throw an error
  const CAGConnection = Adapter.get(RESOURCE.CAG);

  // Update CAG/model count in cache
  const model = await CAGConnection.findOne([{ field: 'id', value: modelId }], {});
  const projectId = model.project_id;
  const projectCache = get(projectId);
  projectCache.stat.model_count -= 1;
  set(projectId, projectCache);

  // Delete CAG
  const results = await CAGConnection.remove([{ field: 'id', value: modelId }]);
  if (!results.deleted) {
    throw new Error(`Unable to delete model: ${modelId}`);
  }

  // Delete Edge Parameters
  const edgeConnection = Adapter.get(RESOURCE.EDGE_PARAMETER);
  await edgeConnection.remove([{ field: 'model_id', value: modelId }]);

  // Delete Node Parameters
  const nodeConnection = Adapter.get(RESOURCE.NODE_PARAMETER);
  await nodeConnection.remove([{ field: 'model_id', value: modelId }]);

  // Delete Scenarios
  const scenarioConnection = Adapter.get(RESOURCE.SCENARIO);
  await scenarioConnection.remove([{ field: 'model_id', value: modelId }]);

  return true;
};

/**
 * Updates the user_polarity for an edge which overwrites .polarity produced by the edge statements
 */
const updateEdgeUserPolarity = async(modelId, edgeId, userPolarity) => {
  const edgeAdapter = Adapter.get(RESOURCE.EDGE_PARAMETER);
  const results = await edgeAdapter.update([
    {
      id: edgeId,
      user_polarity: userPolarity
    }
  ], d => d.id);

  if (results.errors) {
    throw new Error(`Unable to set edge user_polarity: ${edgeId}`);
  }

  return true;
};

/**
 * Return a search query: Search amongst a list of models ones that contain one or more statements
 * specified in statementIds
 */
const _buildCAGStatementIntersectionSearch = (modelIds, statementIds) => {
  return {
    size: 0,
    query: {
      bool: {
        filter: [
          {
            terms: {
              model_id: modelIds
            }
          },
          {
            terms: {
              reference_ids: statementIds
            }
          }
        ]
      }
    },
    aggs: {
      modelIds: {
        terms: {
          size: 10000,
          field: 'model_id'
        }
      }
    }
  };
};



/**
 * If CAG is built from updatedStatementIds, then it possibly is
 * now stale and will be marked as so.
 *
 * Note we are assuming that updatedStatementIds is of reasonable size,
 * say between 1 to 5000. Any higher amount and we can get into database
 * limitation issues, or performance issues.
 *
 * @param {string} projectId - project identifier
 * @param {array} updatedStatementIds - list of statement id strings
 */
const checkStaleCAGs = async (projectId, updatedStatementIds) => {
  const CAGConnection = Adapter.get(RESOURCE.CAG);

  // 1) Get model ids
  const models = await CAGConnection.find([
    { field: 'project_id', value: projectId },
    { field: 'is_stale', value: false } // If already stale, then no point marking it stale again
  ], { size: SEARCH_LIMIT });
  const modelIds = models.map(m => m.id);

  // 2) Find models with outdated statements
  const searchBody = _buildCAGStatementIntersectionSearch(modelIds, updatedStatementIds);
  const result = await client.search({
    index: RESOURCE.EDGE_PARAMETER,
    body: searchBody
  });

  // 3) Parse out models and update
  const staleModels = result.body.aggregations.modelIds.buckets.map(d => d.key);

  Logger.info('Found stale models : ' + JSON.stringify(staleModels));

  if (_.isEmpty(staleModels)) return []; // nothing to do

  // 4) Mark CAGs as stale
  const timestamp = moment().valueOf();
  const updatePayload = staleModels.map(id => {
    return {
      id: id,
      is_stale: true,
      modified_at: timestamp
    };
  });
  CAGConnection.update(updatePayload, d => d.id, 'true', 3);
  return staleModels;
};

/**
 * Recalculate the statement reference_ids for each edge. Any statements that have been discarded or no longer
 * match the topological source/target concepts are removed.
 *
 * @param {string} modelId - model identifier
 */
const recalculateCAG = async (modelId) => {
  const cagAdapter = Adapter.get(RESOURCE.CAG);
  const edgeParameterAdapter = Adapter.get(RESOURCE.EDGE_PARAMETER);

  const cag = await cagAdapter.findOne([
    { field: 'id', value: modelId }
  ], {});

  const statementAdapter = Adapter.get(RESOURCE.STATEMENT, cag.project_id);
  const edges = await edgeParameterAdapter.find([
    { field: 'model_id', value: modelId }
  ], { size: SEARCH_LIMIT });

  Logger.info(`Recalculate model ${modelId} with ${edges.length} edges and ${_.sumBy(edges, e => e.reference_ids.length)} statements`);


  // Remove invalid reference_ids
  const timestamp = moment().valueOf();
  const updatePayload = [];
  const promises = [];

  // Given an edge composition of statements [a, b, c, ...], see if we can still find the
  // same composition with respect to the edge's source/target
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    const subjConcept = e.source;
    const objConcept = e.target;
    const referenceIds = e.reference_ids;

    // Filter out changed and discarded edges
    promises.push(statementAdapter.find({
      clauses: [
        { field: 'subjConcept', values: [subjConcept], isNot: false, operand: 'OR' },
        { field: 'objConcept', values: [objConcept], isNot: false, operand: 'OR' },
        { field: 'id', values: referenceIds }
      ]
    }, { size: SEARCH_LIMIT, includes: ['id', 'wm.statement_polarity'] }));
  }

  const edgeResults = await Promise.all(promises);

  let isAmbiguous = false;
  // Resolve expected edge composition versus the actual edge composition
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    const validStatements = edgeResults[i];
    const referenceIds = e.reference_ids;
    // Get polarities from backing statements
    let edgePolarities = validStatements.map(s => s.wm.statement_polarity);

    // use edge polarity if no back statements found
    if (edgePolarities.length === 0) {
      const edgePolarity = _.get(e, 'polarity', 0);
      edgePolarities = [edgePolarity];
    }

    // check if edge has ambiguity conditions
    if (_.isNil(e.user_polarity) && modelUtil.isEdgeAmbiguous(edgePolarities)) {
      isAmbiguous = true;
    }

    if (referenceIds.length !== validStatements.length) {
      Logger.info(`checking edge ${e.source} - ${e.target} changed`);
      e.reference_ids = validStatements.map(d => d.id);
      e.modified_at = timestamp;
      updatePayload.push(e);
    }
  }
  Logger.info(`Need to update ${updatePayload.length} edges`);

  // Write back result and update CAG status when there is something to update
  if (updatePayload.length > 0) {
    await edgeParameterAdapter.update(updatePayload, d => d.id);
  }
  if (updatePayload.length > 0 || cag.is_ambiguous !== isAmbiguous) {
    await cagAdapter.update([
      {
        id: cag.id,
        is_stale: false,
        is_synced: false,
        is_ambiguous: isAmbiguous,
        modified_at: timestamp
      }
    ], d => d.id);
  }
};


/**
 * Get statements data by ids
 *
 * @param {string} projectId - project identifier
 * @param {array} referenceIds - statement ids
 */
const _getCAGStatements = async (projectId, referenceIds) => {
  const statementAdapter = Adapter.get(RESOURCE.STATEMENT, projectId);
  return statementAdapter.find({
    clauses: [
      { field: 'id', values: referenceIds, operand: 'or', isNot: false }
    ]
  }, { size: SEARCH_LIMIT, excludes: ['subj.candidates', 'obj.candidates'] });
};

/**
 * Handy function to get statements of a CAG by edges
 * @param {object} edge - {source, target} pair
 */
const getStatementsByEdge = async (modelId, edge) => {
  Logger.info(`Getting statements by CAG edge ${modelId}, ${edge.source} => ${edge.target}`);
  const cagAdapter = Adapter.get(RESOURCE.CAG);
  const edgeAdapter = Adapter.get(RESOURCE.EDGE_PARAMETER);
  const projectId = (await cagAdapter.findOne([{ field: 'id', value: modelId }], {})).project_id;

  const result = await edgeAdapter.find([
    { field: 'source', value: edge.source },
    { field: 'target', value: edge.target },
    { field: 'model_id', value: modelId }
  ], { size: SEARCH_LIMIT });

  return _getCAGStatements(projectId, _.flatten(result.map(d => d.reference_ids)));
};

/**
 * Handy function to get statements of a CAG by nodes
 * @param {string} concept - node concept
 */
const getStatementsByNode = async (modelId, concept) => {
  Logger.info(`Getting statements by CAG node/concept ${modelId}, ${concept}`);
  const cagAdapter = Adapter.get(RESOURCE.CAG);
  const projectId = (await cagAdapter.findOne([{ field: 'id', value: modelId }], {})).project_id;
  const edgeAdapter = Adapter.get(RESOURCE.EDGE_PARAMETER);

  const sourceResult = await edgeAdapter.find([
    { field: 'source', value: concept },
    { field: 'model_id', value: modelId }
  ], { size: SEARCH_LIMIT });

  const targetResult = await edgeAdapter.find([
    { field: 'target', value: concept },
    { field: 'model_id', value: modelId }
  ], { size: SEARCH_LIMIT });


  return _getCAGStatements(projectId, [
    ..._.flatten(sourceResult.map(d => d.reference_ids)),
    ..._.flatten(targetResult.map(d => d.reference_ids))
  ]);
};

module.exports = {
  listCAGs,
  findOne,
  createCAG,
  updateCAG,
  updateCAGMetadata,
  getComponents,
  pruneCAG,
  deleteCAG,
  recalculateCAG,
  checkStaleCAGs,
  updateEdgeUserPolarity,

  getAllComponents,
  getStatementsByEdge,
  getStatementsByNode
};
