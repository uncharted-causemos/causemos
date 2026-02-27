import _ from 'lodash';
import * as ES from './client';
import { DatacubeQueryUtil } from './datacube-query-util';
import { AggUtil } from './agg-util';
import { FIELDS, FIELD_TYPES, FIELD_LEVELS, NESTED_FIELD_PATHS } from './datacube-config';
import Logger from '#@/config/logger.js';

const MAX_ES_SUGGESTION_BUCKET_SIZE = 20;

const aggUtil = new AggUtil(FIELDS);
const queryUtil = new DatacubeQueryUtil();

const _facetQuery = (filters: any, fields: string[] = []): any => {
  const filterQuery = queryUtil.buildQuery(filters);
  const aggregations: Record<string, any> = {};
  fields.forEach((field) => {
    const fieldMeta = FIELDS[field];
    if (fieldMeta.type === FIELD_TYPES.NORMAL) {
      aggregations[field] = aggUtil.termsAggregation(field);
    } else if (fieldMeta.type === FIELD_TYPES.RANGED) {
      aggregations[field] = aggUtil.rangeAggregation(field);
    } else if (fieldMeta.type === FIELD_TYPES.DATE) {
      aggregations[field] = aggUtil.dateRangeAggregation(field);
    } else if (fieldMeta.type === FIELD_TYPES.DATE_MILLIS) {
      aggregations[field] = aggUtil.dateRangeAggregation(field, true);
    } else {
      throw new Error(`Unsupported aggregation for field ${field}`);
    }
  });
  return { size: 0, query: filterQuery.query, aggs: aggregations };
};

const _facetPostProcess = (fields: string[], facets: any): Record<string, any[]> => {
  const result: Record<string, any[]> = {};
  fields.forEach((field) => {
    const fieldMeta = FIELDS[field];
    if (fieldMeta.type === FIELD_TYPES.DATE || fieldMeta.type === FIELD_TYPES.DATE_MILLIS) {
      const dateHistogramData = facets[field].buckets;
      const dateKeys = Object.keys(dateHistogramData);
      result[field] = dateKeys.map((key) => ({
        key,
        value: dateHistogramData[key].doc_count,
      }));
    } else {
      result[field] = facets[field].buckets.map((bucket: any) => ({
        key: bucket.key,
        value: bucket.doc_count,
      }));
    }
  });
  return result;
};

const _keyFn = (doc: any): string => doc.id;

export class Datacube {
  index: string;
  client: typeof ES.client;

  constructor(index: string) {
    if (_.isNil(index) || _.isEmpty(index)) {
      throw new Error('Index is empty or undefined');
    }
    this.index = index;
    this.client = ES.client;
  }

  async findOne(filters: any, options: any): Promise<any> {
    options.size = 1;
    const result = await this._search(filters, options);
    if (_.isEmpty(result.hits.hits)) return null;
    return result.hits.hits[0]._source;
  }

  async find(filters: any, options: any): Promise<any[]> {
    const result = await this._search(filters, options);
    if (_.isEmpty(result.hits.hits)) return [];
    return result.hits.hits.map((d: any) => d._source);
  }

  async count(filters: any): Promise<number> {
    const filterQuery = queryUtil.buildQuery(filters);
    const countQuery = { index: this.index, body: filterQuery };
    const result = await this.client.count(countQuery);
    return (result.body as any).count;
  }

  async getFacets(filters: any, fieldNames: string[]): Promise<Record<string, any[]>> {
    const filteredFieldNames = fieldNames.filter(
      (f) => FIELDS[f] && FIELDS[f].level === FIELD_LEVELS.DATACUBE
    );
    if (_.isEmpty(filteredFieldNames)) return {};

    const query = _facetQuery(filters, filteredFieldNames);
    const response = await this.client.search({ index: this.index, body: query });
    const facets = (response.body as any).aggregations;
    if (_.isEmpty(facets)) return {};
    return _facetPostProcess(filteredFieldNames, facets);
  }

  async searchFields(searchField: string, queryString: string): Promise<string[]> {
    const fieldNames = FIELDS[searchField].fields;
    const aggFieldNames = FIELDS[searchField].aggFields || fieldNames;

    const processedQuery = decodeURI(queryString)
      .split(' ')
      .filter((el) => el !== '')
      .map((el) => `${el}*`)
      .join(' ');

    const searchBodies: any[] = [];
    fieldNames.forEach((field: string, idx: number) => {
      searchBodies.push({ index: this.index });
      searchBodies.push({
        size: 0,
        aggs: this._createNestedQuery(field, {
          filtered: {
            filter: {
              query_string: {
                fields: [field],
                query: processedQuery,
                default_operator: 'AND',
              },
            },
            aggs: {
              fieldAgg: {
                terms: { field: aggFieldNames[idx], size: MAX_ES_SUGGESTION_BUCKET_SIZE },
              },
            },
          },
        }),
      });
    });

    const { body } = await this.client.msearch({ body: searchBodies });

    const allResults = (body as any).responses.reduce((acc: any[], resp: any) => {
      const aggs = resp.aggregations.nestedAgg || resp.aggregations;
      return acc.concat(aggs.filtered.fieldAgg.buckets);
    }, []);

    return _(allResults)
      .groupBy('key')
      .map((items: any[]) => ({
        key: items[0].key,
        count: items.reduce((acc, item) => acc + item.doc_count, 0),
      }))
      .sort((a, b) => b.count - a.count)
      .map((item) => item.key)
      .value();
  }

  async searchDatasets(datacubeType: string, limit: number): Promise<any[]> {
    const aggFieldName = (FIELDS.dataId.aggFields || FIELDS.dataId.fields)[0];
    const query = {
      size: 0,
      query: { bool: { filter: { term: { type: datacubeType } } } },
      aggs: {
        data_id_agg: {
          terms: { field: aggFieldName, size: limit },
          aggs: {
            one_doc: {
              top_hits: {
                size: 1,
                _source: ['data_id', 'name', 'created_at', 'maintainer.organization'],
              },
            },
          },
        },
      },
    };

    const { body } = await this.client.search({ index: this.index, body: query });
    const aggBuckets = (body as any).aggregations.data_id_agg.buckets;
    return aggBuckets
      .map((item: any) => {
        const doc = item.one_doc.hits.hits[0];
        return !doc
          ? undefined
          : {
              data_id: item.key,
              indicator_count: item.doc_count,
              name: doc._source.name,
              created_at: doc._source.created_at,
              source: _.get(doc, '_source.maintainer.organization'),
            };
      })
      .filter(Boolean);
  }

  _createNestedQuery(field: string, query: any): any {
    const nestedPath = _.find(Object.values(NESTED_FIELD_PATHS), (path) =>
      field.startsWith(path as string)
    );
    if (nestedPath) {
      return { nestedAgg: { nested: { path: nestedPath }, aggs: query } };
    }
    return query;
  }

  async insert(payloadArray: any[], refreshOption = 'true'): Promise<any> {
    return this._bulk('index', payloadArray, refreshOption);
  }

  async update(payloadArray: any[], refreshOption = 'true'): Promise<any> {
    return this._bulk('update', payloadArray, refreshOption);
  }

  async delete(payloadArray: any[], refreshOption = 'true'): Promise<any> {
    return this._bulk('delete', payloadArray, refreshOption);
  }

  async _search(filters: any, options: any): Promise<any> {
    const filterQuery = queryUtil.buildQuery(filters);
    const searchPayload: any = { index: this.index, body: filterQuery };
    searchPayload.size = !_.isNil(options.size) ? +options.size : 50;
    searchPayload.from = !_.isNil(options.from) ? +options.from : 0;

    if (!_.isEmpty(options.sort)) {
      const sort: Record<string, any> = {};
      Object.keys(options.sort).forEach((key) => {
        const esField = FIELDS[key].fields[0];
        sort[esField] = options.sort[key];
      });
      searchPayload.body.sort = sort;
    }
    if (options.excludes || options.includes) searchPayload.body._source = {};
    if (options.excludes) searchPayload.body._source.excludes = options.excludes;
    if (options.includes) searchPayload.body._source.includes = options.includes;
    if (options.collapse) searchPayload.body.collapse = options.collapse;

    const response = await this.client.search(searchPayload);
    return (response as any).body;
  }

  async _bulk(operationType: string, payloadArray: any[], refreshOption: string): Promise<any> {
    const bulk: any[] = [];
    payloadArray.forEach((doc) => {
      bulk.push({ [operationType]: { _index: this.index, _id: _keyFn(doc) } });
      if (operationType === 'update') {
        if (doc.default_state?.breakdownState) {
          bulk.push({ doc: { default_state: { breakdownState: null } } });
          bulk.push({ [operationType]: { _index: this.index, _id: _keyFn(doc) } });
        }
        bulk.push({ doc });
      } else if (operationType === 'index' || operationType === 'create') {
        bulk.push(doc);
      }
    });

    try {
      const response = await this.client.bulk({ refresh: refreshOption as any, body: bulk });
      const body = (response as any).body;
      if (body.errors) {
        const errors = ES.getBulkErrors(body);
        errors.forEach(Logger.error);
      }
      return body;
    } catch (err) {
      Logger.error(err);
      return null;
    }
  }
}
