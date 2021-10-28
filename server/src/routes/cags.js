const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const cagService = rootRequire('/services/cag-service');
const historyService = rootRequire('/services/history-service');
const { MODEL_STATUS } = rootRequire('/util/model-util');


const OPERATION = Object.freeze({
  REMOVE: 'remove',
  UPDATE: 'update'
});

/**
 * POST an edge polarity
 */
router.put('/:mid/edge-polarity', asyncHandler(async (req, res) => {
  const editTime = Date.now();
  const modelId = req.params.mid;
  const {
    edge_id: edgeId,
    polarity
  } = req.body;
  await cagService.updateEdgeUserPolarity(modelId, edgeId, polarity);
  await cagService.updateCAGMetadata(modelId, { status: MODEL_STATUS.UNSYNCED });

  res.status(200).send({ polarity, updateToken: editTime });
}));

/**
 * POST a new CAG from an Existing CAG
 */
router.post('/:mid/', asyncHandler(async (req, res) => {
  const editTime = Date.now();
  const modelId = req.params.mid;
  const CAG = await cagService.getComponents(modelId);

  const { name } = req.body;

  // Get all the relevant model data to populate the metadata. We wish
  // to ignore the edges, nodes, and id.
  const modelData = {};

  const attrBlacklist = ['edges', 'nodes', 'id', 'created_at', 'modified_at', 'groups'];
  Object.keys(CAG).forEach(key => {
    if (attrBlacklist.indexOf(key) === -1) {
      if (key === 'name') {
        modelData[key] = 'Copy of ' + CAG[key];
      } else {
        modelData[key] = CAG[key];
      }
    }
  });

  // Strip off uneeded edge properties
  const edges = CAG.edges.map(e => {
    return {
      source: e.source,
      target: e.target,
      parameter: e.parameter,
      user_polarity: e.user_polarity,
      reference_ids: e.reference_ids
    };
  });

  // Strip off uneeded node properties
  const nodes = CAG.nodes.map(n => {
    return {
      concept: n.concept,
      parameter: n.parameter,
      label: n.label
    };
  });

  const { id: newId } = await cagService.createCAG({
    ...modelData
  }, edges, nodes);

  // Need to re-apply status code because create defaults to false
  await cagService.updateCAGMetadata(newId, {
    id: newId,
    name: name,
    status: MODEL_STATUS.UNSYNCED,
    is_stale: CAG.is_stale,
    is_quantified: false
  });

  historyService.logHistory(newId, 'duplicate', nodes, edges);

  res.status(200).send({ updateToken: editTime, id: newId });
}));

/**
 * PUT new data in an existing CAG
 */
router.put('/:mid/components/', asyncHandler(async (req, res) => {
  const editTime = Date.now();
  const modelId = req.params.mid;
  const {
    operation,
    edges,
    nodes,
    updateType
  } = req.body;

  // Perform the specified operation, or if it's not a supported operation
  // throw an error
  switch (operation) {
    case OPERATION.REMOVE:
      await cagService.pruneCAG(modelId, edges, nodes, updateType);
      historyService.logHistory(modelId, updateType, nodes, edges);
      break;
    case OPERATION.UPDATE:
      await cagService.updateCAG(modelId, edges, nodes, updateType);
      historyService.logHistory(modelId, updateType, nodes, edges);
      break;
    default:
      throw new Error('Operation not supported: ' + operation);
  }

  res.status(200).send({ updateToken: editTime });
}));

router.put('/:mid/groups/', asyncHandler(async (req, res) => {
  const editTime = Date.now();
  const modelId = req.params.mid;
  const {
    operation,
    groups
  } = req.body;

  // Perform the specified operation, or if it's not a supported operation
  // throw an error
  switch (operation) {
    case OPERATION.REMOVE:
      await cagService.deleteGroups(modelId, groups);
      break;
    case OPERATION.UPDATE:
      await cagService.updateGroups(modelId, groups);
      break;
    default:
      throw new Error('Operation not supported: ' + operation);
  }

  res.status(200).send({ updateToken: editTime });
}));

/**
 * GET CAG components
 */
router.get('/:mid/components/', asyncHandler(async (req, res) => {
  const modelId = req.params.mid;
  const result = await cagService.getComponents(modelId);
  res.json(result);
}));


router.get('/:mid/edge-statements', asyncHandler(async (req, res) => {
  const modelId = req.params.mid;
  const source = req.query.source;
  const target = req.query.target;
  const result = await cagService.getStatementsByEdge(modelId, { source, target });
  res.json(result);
}));

router.get('/:mid/node-statements', asyncHandler(async (req, res) => {
  const modelId = req.params.mid;
  const concept = req.query.concept;
  const result = await cagService.getStatementsByNode(modelId, concept);
  res.json(result);
}));


/**
 * Send a request to recalculate the CAG's edges' statements, this will remove
 * statements that no longer match the edge's source/target pairing
 */
router.post('/:mid/recalculate', asyncHandler(async (req, res) => {
  const modelId = req.params.mid;
  const result = await cagService.recalculateCAG(modelId);
  res.json(result);
}));


/**
 * Change node's concept and the corresponding source/target on edges
 */
router.post('/:mid/change-concept', asyncHandler(async (req, res) => {
  const change = req.body;
  const modelId = req.params.mid;

  await cagService.changeConcept(modelId, change);
  const editTime = Date.now();
  res.status(200).send({ updateToken: editTime });
}));

module.exports = router;
