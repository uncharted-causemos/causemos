const _ = require('lodash');
const combinatorics = require('js-combinatorics/combinatorics');
const statementUtil = rootRequire('/util/statement-util');

/**
 * @param {object} result - graph api result
 */
const buildGraphCache = (result) => {
  const incoming = {};
  const outgoing = {};
  const _addEntry = (map, key, value) => {
    if (!{}.hasOwnProperty.call(map, key)) {
      map[key] = [];
    }
    map[key].push(value);
  };

  result.forEach(edge => {
    const id = edge._id;
    const cause = id.split('///')[0];
    const effect = id.split('///')[1];
    _addEntry(outgoing, cause, effect);
    _addEntry(incoming, effect, cause);
  });
  return { incoming, outgoing };
};


/**
 * Recursive helper to traverse the graph. It is up to the goal function to collect any data
 *
 * @param {string} source - source id
 * @param {array} stack - path tracking
 * @param {function} goalFn - goal function, takes in (node, stack)
 * @param {function} terminateFn - terminate function, takes in (node, stack)
 */
const _crawler = (cache, source, stack, goalFn, terminateFn) => {
  const node = source;
  const expansion = cache[node] || [];

  // Nothing to process
  if (expansion.length === 0) {
    return;
  }

  expansion.forEach(n => {
    const newNode = n;
    const newStack = _.cloneDeep(stack);

    // Found a cycle without hitting target, stop
    if (newStack.indexOf(newNode) >= 0) {
      return;
    }
    newStack.push(newNode);

    if (goalFn(newNode, newStack)) return;
    if (terminateFn(newNode, newStack)) return;

    _crawler(cache, newNode, newStack, goalFn, terminateFn);
  });
};


/**
 * Find neighborhood among some specified nodes
 * Basically for any given pair of nodes {x, y} in {v1, v2, v3, ... } we want to find
 * all path less then or equal to k hops away.
 *
 * @param {object} cache - graph cache
 * @param {array} nodes - array of node ids
 * @param {number} k - maximum number of hops to check
 */
const normalPath = (cache, nodes, k) => {
  const neighborhoodNodes = [];

  // Guard against weird input
  if (nodes.length < 2) {
    return [];
  }

  const links = combinatorics.combination(nodes, 2);
  while (true) {
    const link = links.next();
    if (!link) {
      break;
    }

    // Generates a targetFn that checks against target
    const goalFnGenerator = (target) => {
      return (newNode, stack) => {
        if (newNode === target) {
          neighborhoodNodes.push(stack);
          return true;
        }
        return false;
      };
    };

    // Exceed allowed length or hitting a cycle
    const terminateFn = (newNode, stack) => {
      if (stack.length > k) return true;
      return false;
    };

    _crawler(cache, link[0], [link[0]], goalFnGenerator(link[1]), terminateFn);
    _crawler(cache, link[1], [link[1]], goalFnGenerator(link[0]), terminateFn);
  }
  return neighborhoodNodes;
};

const interventionPath = (cache, node, k) => {
  const neighborhoodNodes = [];
  const goalFn = (newNode, stack) => {
    if (statementUtil.isInterventionNode(newNode)) {
      neighborhoodNodes.push(stack);
      return true;
    }
    return false;
  };
  const terminateFn = (newNode, stack) => {
    if (stack.length > k) return true;
    return false;
  };
  _crawler(cache, node, [node], goalFn, terminateFn);
  return neighborhoodNodes;
};

module.exports = {
  buildGraphCache,
  normalPath,
  interventionPath
};
