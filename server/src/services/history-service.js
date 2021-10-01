const { v4: uuid } = require('uuid');
const { Adapter, RESOURCE } = rootRequire('/adapters/es/adapter');

const _description = (nodes, edges) => {
  const nodeNames = nodes.map(n => n.concept ? n.concept : n.id).join(', ');
  const edgeNames = edges.map(e => `${e.source} => ${e.target}`).join(', ');
  return `Nodes: [${nodeNames}] Edges: [${edgeNames}]`;
};

const logHistory = (modelId, type, nodes, edges) => {
  const historyConnection = Adapter.get(RESOURCE.MODEL_HISTORY);

  let desc = _description(nodes, edges);

  if (type === 'set weights') {
    const edge = edges[0];
    desc = `${edge.source} => ${edge.target}, ${edge.parameter.weights.join(', ')}`;
  } else if (type === 'clear parameter') {
    const node = nodes[0];
    desc = `${node.id}`; // FIXME, better info
  } else if (type === 'set parameter') {
    const node = nodes[0];
    desc = `${node.concept}, ${JSON.stringify(node.parameter)}`;
  }


  historyConnection.insert({
    model_id: modelId,
    type: type,
    modified_at: Date.now(),
    description: desc
  }, () => uuid());
};


module.exports = {
  logHistory
};
