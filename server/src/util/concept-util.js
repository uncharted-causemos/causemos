const _ = require('lodash');
/**
 * @param {Object} result resulting extracted concept key to concept definition
 * @param {Object} input  metadata input
 * @param {String} prefix
 */
const extractOntologyMetadata = (resultBuffer, node, prefix) => {
  const entry = {
    definition: node.descriptions || [],
    examples: node.examples || [],
  };

  // Recurse
  const nextPrefix = prefix === '' ? node.name : `${prefix}/${node.name}`;
  resultBuffer[nextPrefix] = entry;
  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      extractOntologyMetadata(resultBuffer, node.children[i].node, nextPrefix);
    }
  }
};

const getOntologyShortName = (name) => {
  if (_.isNil(name)) return '';

  const nameArray = name.split('/');
  return nameArray.pop();
};

module.exports = {
  extractOntologyMetadata,
  getOntologyShortName,
};
