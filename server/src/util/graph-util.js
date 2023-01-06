const _ = require('lodash');
const combinatorics = require('js-combinatorics/combinatorics');

/**
 * @param {array} edges - array of source/target
 */
const buildAdjacency = (edges) => {
  const incoming = new Map();
  const outgoing = new Map();
  const _addEntry = (map, key, value) => {
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(value);
  };

  edges.forEach((edge) => {
    const cause = edge.source;
    const effect = edge.target;
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
const _crawler = (adjacencyMap, source, stack, goalFn, terminateFn) => {
  const node = source;
  const expansion = adjacencyMap.get(node) || [];

  // Nothing to process
  if (expansion.length === 0) {
    return;
  }

  expansion.forEach((n) => {
    const newNode = n;
    const newStack = _.cloneDeep(stack);

    // Found a cycle without hitting target, stop
    if (newStack.indexOf(newNode) >= 0) {
      return;
    }
    newStack.push(newNode);

    if (goalFn(newNode, newStack)) return;
    if (terminateFn(newNode, newStack)) return;

    _crawler(adjacencyMap, newNode, newStack, goalFn, terminateFn);
  });
};

/**
 * Find neighborhood among two sets/groups of nodes, such as two merged nodes with some n concepts in each
 * Basically for any given pair of nodes groups {x, y} in {v1, v2, v3, ... } we want to find
 * all path less then or equal to k hops away.
 *
 * @param {array} - graph edges
 * @param {array} sourceNodes - array of node ids
 * @param {array} targetNodes - array of node ids
 * @param {number} k - maximum number of hops to check
 */
const groupPath = (edges, sourceNodes, targetNodes, k) => {
  const neighborhoodNodes = [];
  const visitedPaths = new Set();

  // Guard against weird input
  if (sourceNodes.length < 1 && targetNodes.length < 1) {
    return [];
  }

  const adjacencyMap = buildAdjacency(edges).outgoing;

  const links = sourceNodes.map((sn) => [sn, targetNodes]);

  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    if (!link) {
      break;
    }

    // Generates a targetFn that checks against our targets
    const goalFnGenerator = (targets) => {
      return (newNode, stack) => {
        const connectingPath = stack
          .filter((n) => !sourceNodes.includes(n) && !targetNodes.includes(n))
          .toString();
        if (targets.includes(newNode) && !visitedPaths.has(connectingPath)) {
          neighborhoodNodes.push(stack);
          visitedPaths.add(connectingPath);
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
    _crawler(adjacencyMap, link[0], [link[0]], goalFnGenerator(link[1]), terminateFn);
  }
  return neighborhoodNodes;
};

/**
 * Find neighborhood among some specified nodes
 * Basically for any given pair of nodes {x, y} in {v1, v2, v3, ... } we want to find
 * all path less then or equal to k hops away.
 *
 * @param {array} - graph edges
 * @param {array} nodes - array of node ids
 * @param {number} k - maximum number of hops to check
 */
const normalPath = (edges, nodes, k) => {
  const neighborhoodNodes = [];

  // Guard against weird input
  if (nodes.length < 2) {
    return [];
  }

  const adjacencyMap = buildAdjacency(edges).outgoing;
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
    _crawler(adjacencyMap, link[0], [link[0]], goalFnGenerator(link[1]), terminateFn);
    // _crawler(adjacencyMap, link[1], [link[1]], goalFnGenerator(link[0]), terminateFn);
  }
  return neighborhoodNodes;
};

module.exports = {
  buildAdjacency,
  groupPath,
  normalPath,
};
