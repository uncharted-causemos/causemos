const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const cagService = rootRequire('/services/cag-service');
const historyService = rootRequire('/services/history-service');
const scenarioService = rootRequire('/services/scenario-service');
const { MODEL_STATUS, RESET_ALL_ENGINE_STATUS } = rootRequire('/util/model-util');
const modelUtil = rootRequire('util/model-util');

const { Adapter, RESOURCE } = rootRequire('/adapters/es/adapter');

/* Keycloak Authentication */
const keycloak = rootRequire('/config/keycloak-config.js').getKeycloak();
const { PERMISSIONS } = rootRequire('/util/auth-util.js');

const OPERATION = Object.freeze({
  REMOVE: 'remove',
  UPDATE: 'update',
});

/**
 * POST an edge polarity
 */
router.put(
  '/:mid/edge-polarity',
  keycloak.enforcer([PERMISSIONS.USER]),
  asyncHandler(async (req, res) => {
    const editTime = Date.now();
    const modelId = req.params.mid;
    const { edge_id: edgeId, polarity } = req.body;
    await cagService.updateEdgeUserPolarity(modelId, edgeId, polarity);
    await cagService.updateCAGMetadata(modelId, {
      status: MODEL_STATUS.NOT_REGISTERED,
      engine_status: RESET_ALL_ENGINE_STATUS,
    });

    await scenarioService.invalidateByModel(modelId);

    res.status(200).send({ polarity, updateToken: editTime });
  })
);

/**
 * POST a new CAG from an Existing CAG
 */
router.post(
  '/:mid/',
  keycloak.enforcer([PERMISSIONS.USER]),
  asyncHandler(async (req, res) => {
    const editTime = Date.now();
    const modelId = req.params.mid;
    const CAG = await cagService.getComponents(modelId);

    const { name } = req.body;

    // Get all the relevant model data to populate the metadata. We wish
    // to ignore the edges, nodes, and id.
    const modelData = {};

    const attrBlacklist = ['edges', 'nodes', 'id', 'created_at', 'modified_at', 'groups'];
    Object.keys(CAG).forEach((key) => {
      if (attrBlacklist.indexOf(key) === -1) {
        if (key === 'name') {
          modelData[key] = 'Copy of ' + CAG[key];
        } else {
          modelData[key] = CAG[key];
        }
      }
    });

    // Strip off uneeded edge properties
    const edges = CAG.edges.map((e) => {
      return {
        source: e.source,
        target: e.target,
        parameter: e.parameter,
        user_polarity: e.user_polarity,
        reference_ids: e.reference_ids,
      };
    });

    // Strip off uneeded node properties
    const nodes = CAG.nodes.map((n) => {
      return {
        concept: n.concept,
        parameter: n.parameter,
        label: n.label,
        components: n.components,
        match_candidates: n.match_candidates,
      };
    });

    const { id: newId } = await cagService.createCAG(
      {
        ...modelData,
      },
      edges,
      nodes
    );

    // Need to re-apply status code because create defaults to false
    await cagService.updateCAGMetadata(newId, {
      id: newId,
      name: name,
      status: MODEL_STATUS.NOT_REGISTERED,
      is_stale: CAG.is_stale,
      engine_status: RESET_ALL_ENGINE_STATUS,
    });

    historyService.logHistory(newId, 'duplicate', nodes, edges);

    res.status(200).send({ updateToken: editTime, id: newId });
  })
);

/**
 * PUT new data in an existing CAG
 */
router.put(
  '/:mid/components/',
  keycloak.enforcer([PERMISSIONS.USER]),
  asyncHandler(async (req, res) => {
    const editTime = Date.now();
    const modelId = req.params.mid;
    const { operation, edges, nodes, updateType } = req.body;

    let returnNodeIdHack = false;
    if (nodes && nodes.length === 1 && nodes[0].id === '') {
      returnNodeIdHack = true;
    }

    if (nodes && nodes.length > 0) {
      for (const node of nodes) {
        if (node.parameter && node.parameter.timeseries) {
          const parameter = node.parameter;
          if (_.isNil(parameter.min) || _.isNil(parameter.max)) {
            const { min, max } = modelUtil.projectionValueRange(
              node.parameter.timeseries.map((d) => d.value)
            );
            parameter.min = min;
            parameter.max = max;
          }
        }
      }
    }

    // We delete by ids, so in order to log contents we need to fetch the relevant parts
    let nodePartials = [];
    let edgePartials = [];
    if (operation === OPERATION.REMOVE) {
      const nodeConn = Adapter.get(RESOURCE.NODE_PARAMETER);
      const edgeConn = Adapter.get(RESOURCE.EDGE_PARAMETER);
      nodePartials = await nodeConn.find([{ field: 'id', value: nodes.map((d) => d.id) }], {
        size: 10000,
        includes: ['id', 'concept'],
      });
      edgePartials = await edgeConn.find([{ field: 'id', value: edges.map((d) => d.id) }], {
        size: 10000,
        includes: ['id', 'source', 'target'],
      });
    }

    // Perform the specified operation, or if it's not a supported operation
    // throw an error
    switch (operation) {
      case OPERATION.REMOVE:
        await cagService.pruneCAG(modelId, edges, nodes, updateType);
        historyService.logHistory(modelId, updateType, nodePartials, edgePartials);
        break;
      case OPERATION.UPDATE:
        await cagService.updateCAG(modelId, edges, nodes, updateType);
        historyService.logHistory(modelId, updateType, nodes, edges);
        break;
      default:
        throw new Error('Operation not supported: ' + operation);
    }
    await scenarioService.invalidateByModel(modelId);

    // FIXME: Hacking, need better API.
    // If there is only one node and it has id=='' than we are creating a single node, return the id to the client
    let newNode = null;
    if (returnNodeIdHack === true) {
      const nodeParameterAdapter = Adapter.get(RESOURCE.NODE_PARAMETER);
      newNode = await nodeParameterAdapter.findOne(
        [
          { field: 'model_id', value: modelId },
          { field: 'concept', value: nodes[0].concept },
        ],
        {}
      );
    }

    res.status(200).send({ updateToken: editTime, newNode });
  })
);

router.put(
  '/:mid/groups/',
  keycloak.enforcer([PERMISSIONS.USER]),
  asyncHandler(async (req, res) => {
    const editTime = Date.now();
    const modelId = req.params.mid;
    const { operation, groups } = req.body;

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
  })
);

/**
 * GET CAG components
 */
router.get(
  '/:mid/components/',
  keycloak.enforcer([PERMISSIONS.USER]),
  asyncHandler(async (req, res) => {
    const modelId = req.params.mid;
    const result = await cagService.getComponents(modelId);
    res.json(result);
  })
);

router.get(
  '/:mid/edge-statements',
  keycloak.enforcer([PERMISSIONS.USER]),
  asyncHandler(async (req, res) => {
    const modelId = req.params.mid;
    const source = req.query.source;
    const target = req.query.target;
    const result = await cagService.getStatementsByEdge(modelId, { source, target });
    res.json(result);
  })
);

router.get(
  '/:mid/node-statements',
  keycloak.enforcer([PERMISSIONS.USER]),
  asyncHandler(async (req, res) => {
    const modelId = req.params.mid;
    const concept = req.query.concept;
    const result = await cagService.getStatementsByNode(modelId, concept);
    res.json(result);
  })
);

/**
 * Send a request to recalculate the CAG's edges' statements, this will remove
 * statements that no longer match the edge's source/target pairing
 */
router.post(
  '/:mid/recalculate',
  keycloak.enforcer([PERMISSIONS.USER]),
  asyncHandler(async (req, res) => {
    const modelId = req.params.mid;
    const result = await cagService.recalculateCAG(modelId);
    res.json(result);
  })
);

/**
 * Change node's concept and the corresponding source/target on edges
 */
router.post(
  '/:mid/change-concept',
  keycloak.enforcer([PERMISSIONS.USER]),
  asyncHandler(async (req, res) => {
    const change = req.body;
    const modelId = req.params.mid;

    const { newConcept, oldConcept } = await cagService.changeConcept(modelId, change);
    await scenarioService.invalidateByModel(modelId);

    await cagService.updateCAGMetadata(modelId, {
      status: MODEL_STATUS.NOT_REGISTERED,
      engine_status: RESET_ALL_ENGINE_STATUS,
    });

    historyService.logDescription(
      modelId,
      'rename node',
      `Original=${oldConcept}, New=${newConcept}`
    );

    const editTime = Date.now();
    res.status(200).send({ updateToken: editTime });
  })
);

module.exports = router;
