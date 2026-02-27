import { Project } from './project';
import { Regions } from './regions';
import { Datacube } from './datacube';
import { Base } from './base';

export const SEARCH_LIMIT = 10000;
export const MAX_ES_BUCKET_SIZE = 50000;

export const RESOURCE = Object.freeze({
  PROJECT: 'project',
  ANALYSIS: 'analysis',
  DOMAIN_PROJECT: 'domain-project',
  DATA_MODEL_RUN: 'data-model-run',
  DATA_DATACUBE: 'data-datacube',
  GADM_NAME: 'gadm-name',
  REGIONS: 'regions',
  INSIGHT: 'insight',
  QUESTION: 'question',
  SESSION_LOG: 'session-log',
});

export class Adapter {
  static get(type: string): any {
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
