const { Project } = require('./project');
const { DocumentContext } = require('./document-context');
const { Statement } = require('./statement');
const { Base } = require('./base');

const SEARCH_LIMIT = 10000;
const MAX_ES_BUCKET_SIZE = 50000;

const RESOURCE = Object.freeze({
  // Data hierarchy
  KNOWLEDGE_BASE: 'knowledge-base',
  PROJECT: 'project',
  MODEL: 'model',
  ANALYSIS: 'analysis',
  CAG: 'model', // Duplicate for the time being

  // Qualitative data
  STATEMENT: 'statement',
  DOCUMENT: 'corpus',
  DOCUMENT_CONTEXT: 'document-context',
  PROJECT_EXTENSION: 'project-extension',

  // Quantitative data
  NODE_PARAMETER: 'node-parameter',
  EDGE_PARAMETER: 'edge-parameter',
  SCENARIO: 'scenario',

  // MAAS data
  DATA_MODEL_RUN: 'data-model-run',
  DATA_DATACUBE: 'data-datacube',

  // Misc
  AUDIT: 'audit',
  INSIGHT: 'insight',
  ONTOLOGY: 'ontology',
  SESSION_LOG: 'session-log',
  INDICATOR_METADATA: 'indicator-metadata'
});

class Adapter {
  static get(type, id) {
    if (type === RESOURCE.STATEMENT) {
      return new Statement(id);
    } else if (type === RESOURCE.DOCUMENT_CONTEXT) {
      return new DocumentContext(id, 'corpus');
    } else if (type === RESOURCE.PROJECT) {
      return new Project(type);
    } else {
      return new Base(type);
    }
  }
}

module.exports = {
  Adapter,
  RESOURCE,
  SEARCH_LIMIT,
  MAX_ES_BUCKET_SIZE
};
