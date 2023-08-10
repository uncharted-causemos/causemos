const { Project } = require('./project');
const { Regions } = require('./regions');
const { DocumentContext } = require('./document-context');
const { Statement } = require('./statement');
const { Datacube } = require('./datacube');
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
  NODE_GROUP: 'node-group',

  DOMAIN_PROJECT: 'domain-project',

  // Qualitative data
  STATEMENT: 'statement',
  DOCUMENT: 'corpus',
  DOCUMENT_CONTEXT: 'document-context',

  // Quantitative data
  NODE_PARAMETER: 'node-parameter',
  EDGE_PARAMETER: 'edge-parameter',
  SCENARIO: 'scenario',
  SCENARIO_RESULT: 'scenario-result',
  SENSITIVITY_RESULT: 'sensitivity-result',

  // MAAS data
  DATA_MODEL_RUN: 'data-model-run',
  DATA_DATACUBE: 'data-datacube',
  GADM_NAME: 'gadm-name',
  REGIONS: 'regions',

  // Misc
  AUDIT: 'audit',
  INSIGHT: 'insight',
  QUESTION: 'question',
  ONTOLOGY: 'ontology',
  SESSION_LOG: 'session-log',
  INDICATOR_METADATA: 'indicator-metadata',
  INDICATOR_MATCH_HISTORY: 'indicator-match-history',

  // Tracking
  ASSEMBLY_REQUEST: 'assembly-request',
  PROJECT_EXTENSION: 'project-extension',
  MODEL_HISTORY: 'model-history',
  CURATION_TRACKING: 'curation-tracking',
});

class Adapter {
  static get(type, id) {
    if (type === RESOURCE.STATEMENT) {
      return new Statement(id);
    } else if (type === RESOURCE.DOCUMENT_CONTEXT) {
      return new DocumentContext(id, 'corpus');
    } else if (type === RESOURCE.PROJECT) {
      return new Project(type);
    } else if (type === RESOURCE.DATA_DATACUBE) {
      return new Datacube(type);
    } else if (type === RESOURCE.REGIONS) {
      return new Regions(type);
    } else {
      return new Base(type);
    }
  }
}

module.exports = {
  Adapter,
  RESOURCE,
  SEARCH_LIMIT,
  MAX_ES_BUCKET_SIZE,
};
