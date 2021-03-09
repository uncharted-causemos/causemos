const _ = require('lodash');
/**
 * @param {Object} result resulting extracted concept key to concept definition
 * @param {Object} input  metadata input
 * @param {String} parent flattened parent concepts
 * @param {Number} depth  ontology hierarchy depth
 *
 */
const extractConceptDefinition = (result = {}, input, parent = '', depth = 0) => {
  // leaf node
  if (input.name !== undefined) {
    const key = parent + input.name;
    result[key] = input.definition || '';
  } else {
    Object.keys(input).forEach(k => {
      const key = parent + k;
      if (depth > 1) {
        result[key] = '';
      }
      input[k].forEach(obj => {
        extractConceptDefinition(result, obj, key + '/', depth + 1);
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
  extractConceptDefinition,
  getOntologyShortName
};
