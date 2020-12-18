const _ = require('lodash');
/**
 * @param {Object} result resulting extracted concept key to arrays of examples
 * @param {Object} input  metadata input
 * @param {String} parent flattened parent concepts
 * @param {Number} depth  ontology hierarchy depth
 *
 */
const extractConceptExamples = (result = {}, input, parent = '', depth = 0) => {
  // leaf node
  if (input.name !== undefined) {
    const key = parent + input.name;
    result[key] = input.examples || [];
  } else {
    Object.keys(input).forEach(k => {
      const key = parent + k;
      // Ignore root level ontologies
      if (depth > 1) {
        result[key] = []; // non-leaf doesn't have any examples - Tom C, Sept 11 2020
      }
      input[k].forEach(obj => {
        extractConceptExamples(result, obj, key + '/', depth + 1);
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
  extractConceptExamples,
  getOntologyShortName
};
