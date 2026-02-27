import _ from 'lodash';
import * as ES from './client';
import Logger from '#@/config/logger.js';

/**
 * Translate to ES term query
 */
const parseSimpleFilters = (simpleFilters: any[]): any => {
  const boolFilters: any[] = [];

  if (_.isEmpty(simpleFilters)) {
    return { query: { match_all: {} } };
  }

  simpleFilters.forEach((clause) => {
    if (_.isArray(clause.value)) {
      boolFilters.push({ terms: { [clause.field]: clause.value } });
    } else {
      boolFilters.push({ term: { [clause.field]: clause.value } });
    }
  });
  return { query: { bool: { filter: boolFilters } } };
};

export class Base {
  index: string;
  client: typeof ES.client;

  constructor(index: string) {
    if (_.isNil(index) || _.isEmpty(index)) {
      throw new Error('Index is empty or undefined');
    }
    this.index = index;
    this.client = ES.client;
  }

  async findOne(simpleFilters: any[], options: any = {}): Promise<any> {
    options.size = 1;
    const result = await this._search(simpleFilters, options);
    if (_.isEmpty(result.hits.hits)) return null;
    return result.hits.hits[0]._source;
  }

  async find(simpleFilters: any[], options: any = {}): Promise<any[]> {
    const result = await this._search(simpleFilters, options);
    return result.hits.hits.map((d: any) => d._source);
  }

  async exists(simpleFilters: any[]): Promise<boolean> {
    const options = { size: 0 };
    const result = await this._search(simpleFilters, options);
    return result.hits.total.value > 0;
  }

  async count(simpleFilters: any[]): Promise<number> {
    const countQuery = { index: this.index, body: parseSimpleFilters(simpleFilters) };
    const result = await this.client.count(countQuery);
    return (result.body as any).count;
  }

  async remove(simpleFilters: any[]): Promise<any> {
    try {
      const response = await this.client.deleteByQuery({
        index: this.index,
        refresh: true as any,
        body: parseSimpleFilters(simpleFilters),
      });
      return (response as any).body;
    } catch (err) {
      Logger.error(JSON.stringify(err));
      return null;
    }
  }

  async removeMany(simpleTerms: any): Promise<any> {
    try {
      const response = await this.client.deleteByQuery({
        index: this.index,
        refresh: true as any,
        body: { query: { bool: { must: { terms: simpleTerms } } } },
      });
      return (response as any).body;
    } catch (err) {
      Logger.error(JSON.stringify(err));
      return null;
    }
  }

  async insert(
    payload: any | any[],
    keyFn: (d: any) => string,
    refreshOption = 'true'
  ): Promise<any> {
    let p = payload;
    if (!_.isArray(payload)) p = [payload];
    const bulk: any[] = [];
    p.forEach((d: any) => {
      bulk.push({ index: { _index: this.index, _id: keyFn(d) } });
      bulk.push(d);
    });
    return this._bulk(bulk, refreshOption);
  }

  async update(
    payload: any | any[],
    keyFn: (d: any) => string,
    refreshOption = 'true',
    numRetries = 0
  ): Promise<any> {
    let p = payload;
    if (!_.isArray(payload)) p = [payload];
    const bulk: any[] = [];
    p.forEach((d: any) => {
      bulk.push({ update: { _index: this.index, _id: keyFn(d), retry_on_conflict: numRetries } });
      bulk.push({ doc: d });
    });
    return this._bulk(bulk, refreshOption);
  }

  async updateByQuery(simpleFilters: any[], script: any, refreshOption = true): Promise<any> {
    const payload = {
      index: this.index,
      refresh: refreshOption,
      body: { ...parseSimpleFilters(simpleFilters), script },
    };
    try {
      const response = await this.client.updateByQuery(payload as any);
      return (response as any).body;
    } catch (err) {
      Logger.error(JSON.stringify(err));
      return null;
    }
  }

  async _bulk(requestBody: any[], refreshOption: any): Promise<any> {
    try {
      const response = await this.client.bulk({ refresh: refreshOption, body: requestBody });
      const body = (response as any).body;
      if (body.errors) {
        const errors = ES.getBulkErrors(body);
        errors.forEach(Logger.error);
      }
      return body;
    } catch (err) {
      Logger.error(JSON.stringify(err));
      return null;
    }
  }

  async _search(simpleFilters: any[], options: any): Promise<any> {
    const searchPayload: any = { index: this.index, body: parseSimpleFilters(simpleFilters) };
    if (!_.isNil(options.size)) searchPayload.size = +options.size;
    if (!_.isNil(options.from)) searchPayload.from = +options.from;
    if (options.sort) searchPayload.body.sort = options.sort;
    if (options.excludes || options.includes) searchPayload.body._source = {};
    if (options.excludes) searchPayload.body._source.excludes = options.excludes;
    if (options.includes) searchPayload.body._source.includes = options.includes;
    if (options.version) searchPayload.body.version = options.version;

    const response = await this.client.search(searchPayload);
    if (options.version) {
      (response.body as any).hits.hits.forEach((hit: any) => {
        hit._source._version = hit._version;
      });
    }
    return (response as any).body;
  }

  async getFacets(fieldName: string, simpleFilters: any[] | null = null): Promise<any[]> {
    const query = simpleFilters ? parseSimpleFilters(simpleFilters).query : { match_all: {} };
    const response = await this.client.search({
      index: this.index,
      body: {
        size: 0,
        query,
        aggs: {
          [fieldName]: { terms: { field: fieldName, size: 10000 } },
        },
      },
    });
    return (response.body as any).aggregations[fieldName].buckets;
  }
}
