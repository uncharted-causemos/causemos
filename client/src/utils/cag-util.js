import _ from 'lodash';

/**
 * Merge cagB into cagA. Note this will modify cagA in-place.
 *
 * @param {object} cagA - CAG with edges/nodes
 * @param {object} cagB - CAG with edges/nodes
 * @param {boolean} overwriteParameterization
 */
export const mergeCAG = (cagA, cagB, overwriteParameterization) => {
  // Merge nodes from cagA
  cagB.nodes.forEach(node => {
    const targetNode = cagA.nodes.find(d => d.concept === node.concept);
    if (_.isNil(targetNode)) {
      cagA.nodes.push({
        concept: node.concept,
        label: node.label,
        parameter: node.parameter
      });
    } else {
      if (overwriteParameterization === true) {
        targetNode.parameter = node.parameter;
      }
    }
  });

  // Merge edges from cagB
  cagB.edges.forEach(edge => {
    let targetEdge = null;
    targetEdge = cagA.edges.find(d => d.source === edge.source && d.target === edge.target);

    if (!_.isNil(targetEdge)) {
      targetEdge.reference_ids = _.uniq(targetEdge.reference_ids.concat(edge.reference_ids));
      if (overwriteParameterization === true) {
        targetEdge.parameter = edge.parameter;
      }

      const targetHasUserPolarity = !_.isNil(targetEdge.user_polarity);
      const sourceHasUserPolarity = !_.isNil(edge.user_polarity);
      if (targetHasUserPolarity) {
        if (sourceHasUserPolarity && edge.user_polarity !== targetEdge.user_polarity) {
          // if there is a user_polarity conflict, reset the field as blank so the user must re-review the edge
          targetEdge.user_polarity = null;
        }
      } else if (!targetHasUserPolarity && sourceHasUserPolarity) {
        // if there isn't a conflict, just copy the user_polarity value over
        targetEdge.user_polarity = edge.user_polarity;
      }
    } else {
      cagA.edges.push({
        source: edge.source,
        target: edge.target,
        reference_ids: edge.reference_ids,
        user_polarity: edge.user_polarity,
        parameter: edge.parameter
      });
    }
  });
};


/**
 * A quick check to see if there are conflicting node-parameter information.
 * Short circuit returning true if a conflict can be found.
 *
 * @param {object} currentCAG
 * @param {array} array of cag objects
 */
export const hasMergeConflictNodes = (currentCAG, importCAGs) => {
  for (let i = 0; i < currentCAG.nodes.length; i++) {
    const node = currentCAG.nodes[i];
    for (let j = 0; j < importCAGs.length; j++) {
      const importCAG = importCAGs[j];
      const importNode = importCAG.nodes.find(n => n.concept === node.concept);

      // If encounter the same concept, check if the parameterzation is the same
      if (importNode && !_.isEqual(importNode.parameter, node.parameter)) {
        return true;
      }
    }
  }
  return false;
};

/**
 * A quick check to see if there are conflicting edge-parameter information.
 * Short circuit returning true if a conflict can be found.
 *
 * @param {object} currentCAG
 * @param {array} array of cag objects
 */
export const hasMergeConflictEdges = (currentCAG, importCAGs) => {
  for (let i = 0; i < currentCAG.edges.length; i++) {
    const edge = currentCAG.edges[i];
    for (let j = 0; j < importCAGs.length; j++) {
      const importCAG = importCAGs[j];
      const importEdge = importCAG.edges.find(e => e.source === edge.source && e.target === edge.target);

      // If encounter the same concept, check if the parameterization is the same
      if (importEdge && (!_.isEqual(importEdge.parameter, edge.parameter) || !_.isEqual(importEdge.polarity, edge.polarity))) {
        return true;
      }
    }
  }
  return false;
};

export default {
  mergeCAG,
  hasMergeConflictNodes,
  hasMergeConflictEdges
};
