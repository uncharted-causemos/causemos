import _ from 'lodash';
import { Client } from '@elastic/elasticsearch';

export const client = new Client({
  node: `${process.env.ES_URL}`,
  auth: {
    username: `${process.env.ES_USERNAME}`,
    password: `${process.env.ES_PASSWORD}`,
  },
  ssl: {
    rejectUnauthorized: false,
  },
});

export class QueryStringBuilder {
  operator: string;
  searches: string[];
  fields?: string[];

  constructor() {
    this.operator = 'OR';
    this.searches = [];
  }

  setOperator(v: string): this {
    this.operator = v;
    return this;
  }

  setFields(v: string[]): this {
    this.fields = v;
    return this;
  }

  addWildCard(v: string): this {
    this.searches.push(`${v}*`);
    return this;
  }

  addFuzzy(v: string, dist = 1): this {
    this.searches.push(`${v}~${dist}`);
    return this;
  }

  add(str: string): this {
    this.searches.push(`${str}`);
    return this;
  }

  build(): any {
    const r: any = {
      query_string: {
        query: this.searches.join(` ${this.operator} `),
      },
    };
    if (!_.isEmpty(this.fields)) {
      r.query_string.fields = this.fields;
    }
    return r;
  }
}

export const queryStringBuilder = (): QueryStringBuilder => {
  return new QueryStringBuilder();
};

/**
 * Utility method to handle ES-bulk operation errors
 */
export const getBulkErrors = (body: any, num = 2): string[] => {
  const errors: string[] = [];
  let counter = 0;
  for (let i = 0; i < body.items.length; i++) {
    const item = body.items[i];
    const operation = Object.keys(item)[0];
    if (item[operation].error) {
      errors.push(
        JSON.stringify({
          status: item[operation].status,
          ...item[operation].error,
        })
      );
      counter++;
      if (counter >= num) break;
    }
  }
  return errors;
};

/**
 * Returns elasticsearch highlights with the search results.
 */
export const searchAndHighlight = async (
  index: string,
  queryStringObject: any,
  filters: any[],
  highlightFields: string[]
): Promise<any[]> => {
  const query = _.isEmpty(filters)
    ? queryStringObject
    : {
        bool: {
          must: [...filters, queryStringObject],
        },
      };

  const searchBody: any = { query };
  if (!_.isEmpty(highlightFields)) {
    const fieldsToHighlight: Record<string, any> = {};
    highlightFields.forEach((f) => {
      fieldsToHighlight[f] = {};
    });
    searchBody.highlight = {
      fields: fieldsToHighlight,
      pre_tags: '',
      post_tags: '',
    };
  }

  const matches = await client.search({
    index: index,
    body: searchBody,
  });
  return (matches.body as any).hits.hits;
};
