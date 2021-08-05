const _ = require('lodash');
/**
 * @param {Object} result resulting extracted concept key to concept definition
 * @param {Object} input  metadata input
 * @param {String} parent flattened parent concepts
 * @param {Number} depth  ontology hierarchy depth
 *
 */
const extractConceptMetadata = (result = {}, input, parent = '', depth = 0) => {
  // leaf node
  if (input.name !== undefined) {
    const key = parent + input.name;
    result[key] = {};
    result[key].definition = input.definition || '';
    result[key].examples = input.examples || [];
  } else {
    Object.keys(input).forEach(k => {
      const key = parent + k;
      if (depth > 1) {
        result[key] = { definition: '', examples: [] };
      }
      input[k].forEach(obj => {
        extractConceptMetadata(result, obj, key + '/', depth + 1);
      });
    });
  }
};


const getOntologyShortName = (name) => {
  if (_.isNil(name)) return '';

  const nameArray = name.split('/');
  return nameArray.pop();
};

module.exports = {
  extractConceptMetadata,
  getOntologyShortName
};
