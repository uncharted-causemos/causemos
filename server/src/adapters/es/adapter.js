const { Project } = require('./project');
const { Regions } = require('./regions');
const { Datacube } = require('./datacube');
const { Base } = require('./base');

const SEARCH_LIMIT = 10000;
const MAX_ES_BUCKET_SIZE = 50000;

const RESOURCE = Object.freeze({
  // Data hierarchy
  PROJECT: 'project',
  ANALYSIS: 'analysis',

  DOMAIN_PROJECT: 'domain-project',

  // MAAS data
  DATA_MODEL_RUN: 'data-model-run',
  DATA_DATACUBE: 'data-datacube',
  GADM_NAME: 'gadm-name',
  REGIONS: 'regions',

  // Misc
  INSIGHT: 'insight',
  QUESTION: 'question',
  SESSION_LOG: 'session-log',
});

class Adapter {
  static get(type) {
    if (type === RESOURCE.PROJECT) {
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
