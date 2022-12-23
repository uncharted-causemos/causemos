const registryFunctions = [
  'backgroundClick',
  'backgroundDblClick',
  'backgroundMouseEnter',
  'backgroundMouseLeave',
  'backgroundCtx',
  'nodeClick',
  'nodeDblClick',
  'nodeMouseEnter',
  'nodeMouseLeave',
  'nodeCtx',
  'nodeSave',
  'edgeClick',
  'edgeMouseEnter',
  'edgeMouseLeave',
  'edgeCtx',
];

/**
 * Specifies an interface/contract for interacting with a graph (node-link)
 */
export default class GraphRenderer {
  constructor() {
    this.strategy = null;
    this.data = {};
    this.registry = {};
  }

  setData(data) {
    this.data = data;
  }

  setCallback(name, fn) {
    if (registryFunctions.indexOf(name) === -1) {
      throw new Error(`Failed to register callback, unknown name ${name}`);
    } else {
      this.registry[name] = fn;
    }
  }

  unsetCallback(name) {
    delete this.registry[name];
  }

  initialize(/* element */) {
    throw new Error('Needs impl');
  }

  render() {
    throw new Error('Needs impl');
  }

  setStrategy(strategy) {
    this.strategy = strategy;
  }
}
