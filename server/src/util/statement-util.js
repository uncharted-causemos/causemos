function isInterventionNode(id) {
  return id.startsWith('wm/concept/causal_factor/intervention');
}

module.exports = {
  isInterventionNode
};
