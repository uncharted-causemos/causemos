const _ = require('lodash');
const ES = require('./client');
const { FIELDS, FIELD_LEVELS } = require('./config');
const { StatementQueryUtil } = require('./statement-query-util');

const MAX_DOCUMENT_CONTEXT = 2000;

const queryUtil = new StatementQueryUtil();

const facetQuery = (filters, fieldNames) => {
  const facets = {};
  fieldNames.forEach((field) => {
    // We do not support multi-field facets, so fields is a single element array.
    const esField = (FIELDS[field].aggFields || FIELDS[field].fields)[0];

    facets[field] = {
      terms: {
        field: esField,
        size: 200,
      },
      aggs: {
        uniques: {
          cardinality: {
            field: 'evidence.document_context.doc_id',
          },
        },
      },
    };
  });

  const q = queryUtil.buildQuery(filters);
  const clauses = filters.clauses || [];
  const nestedFilters = queryUtil.buildFilters(
    queryUtil.levelFilter(clauses, FIELD_LEVELS.EVIDENCE)
  );

  return {
    size: 0,
    query: q.query,
    aggs: {
      docs: {
        nested: {
          path: 'evidence',
        },
        aggs: {
          filtered: {
            filter: nestedFilters,
            // filter: { match_all: {} },
            aggs: facets,
          },
        },
      },
    },
  };
};

// Filter for document ids
const idQuery = (filters) => {
  const q = queryUtil.buildQuery(filters);
  const clauses = filters.clauses || [];
  const nestedFilters = queryUtil.buildFilters(
    queryUtil.levelFilter(clauses, FIELD_LEVELS.EVIDENCE)
  );

  return {
    size: 0,
    query: q.query,
    aggs: {
      document_context: {
        nested: {
          path: 'evidence',
        },
        aggs: {
          filtered: {
            filter: nestedFilters,
            aggs: {
              document_id: {
                terms: {
                  field: 'evidence.document_context.doc_id',
                  size: MAX_DOCUMENT_CONTEXT,
                },
              },
            },
          },
        },
      },
    },
  };
};

// Find documents by ids
const attrsQuery = (ids) => {
  return {
    size: MAX_DOCUMENT_CONTEXT,
    _source: {
      // Fields are too large or not useful
      excludes: ['extracted_text', 'ner_analytics'],
    },
    query: {
      bool: {
        filter: {
          terms: {
            id: ids,
          },
        },
      },
    },
  };
};

/**
 * Wraps document context, effectively the searchable parts of a document
 */
class DocumentContext {
  constructor(index, corpusIndex) {
    if (_.isNil(index) || _.isEmpty(index)) {
      throw new Error('Index is empty or undefined');
    }
    if (_.isNil(corpusIndex) || _.isEmpty(corpusIndex)) {
      throw new Error('Corpus-ndex is empty or undefined');
    }

    this.index = index;
    this.corpusIndex = corpusIndex;
    this.client = ES.client;
  }

  /**
   * This is a 2-step find, first we grab the a fixed number of unique ids from
   * the nested document-context objects, then we do the actual retrival based
   * on these ids.
   *
   * @param {object} options
   * @param {number} options.size - number of results to return
   * @param {number} options.from - pagination start
   */
  async find(filters, options) {
    let response = null;
    let result = null;

    // 1) Find document ids
    const searchIDs = {
      index: this.index,
      body: idQuery(filters),
    };

    response = await this.client.search(searchIDs);
    result = response.body;
    const ids = result.aggregations.document_context.filtered.document_id.buckets.map((d) => d.key);

    const from = _.isNil(options.from) ? 0 : +options.from;
    const size = _.isNil(options.size) ? 50 : +options.size;

    if (from + size > MAX_DOCUMENT_CONTEXT) {
      throw new Error('Pagination exceed maximum document limit');
    }

    // 2) Fetch document attributes
    const filteredIds = ids.splice(from, size);
    const searchDocs = {
      index: this.corpusIndex,
      body: attrsQuery(filteredIds),
    };
    response = await this.client.search(searchDocs);

    const docs = response.body.hits.hits;
    return docs.map((d) => d._source);
  }

  /**
   * Returns document context facets
   *
   * @param {object} filters
   * @param {array} fieldsNames - array of config fields
   */
  async getFacets(filters, fieldNames) {
    // Sanity check, remove invalid fields
    const filteredFieldNames = [];
    fieldNames.forEach((f) => {
      if (FIELDS[f] && FIELDS[f].level === FIELD_LEVELS.EVIDENCE) {
        filteredFieldNames.push(f);
      }
    });
    if (_.isEmpty(filteredFieldNames)) {
      return {};
    }

    // Run query
    const response = await this.client.search({
      index: this.index,
      body: facetQuery(filters, filteredFieldNames),
    });

    const facets = response.body.aggregations.docs.filtered;
    const result = {};

    // Pull out uniques
    filteredFieldNames.forEach((fieldName) => {
      result[fieldName] = facets[fieldName].buckets.map((bucket) => {
        return {
          key: bucket.key,
          value: bucket.uniques.value,
        };
      });
    });
    return result;
  }
}

module.exports = { DocumentContext };
