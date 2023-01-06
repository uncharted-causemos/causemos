const expect = require('chai').expect;
const { StatementQueryUtil } = rootRequire('/adapters/es/statement-query-util');
const queryUtil = new StatementQueryUtil();

const EMPTY_ENABLE_FILTER = {
  bool: {
    filter: [
      {
        term: {
          'wm.is_selfloop': false,
        },
      },
      {
        terms: {
          'wm.state': [1, 2],
        },
      },
    ],
  },
};
const EMPTY_GENERAL_FILTER = {
  bool: {
    filter: [
      {
        match_all: {},
      },
    ],
  },
};
const NESTED_PUBLICATION_YEAR_QUERY = {
  nested: {
    path: 'evidence',
    query: [
      {
        bool: {
          should: [{ terms: { 'evidence.document_context.publication_date.year': [2011] } }],
        },
      },
    ],
  },
};

describe('query-util', function () {
  describe('buildQuery', function () {
    let simpleFilter,
      compoundFilters,
      rangeFilter,
      compoundRangeFilter,
      keywordFilters,
      nestedFilters;
    beforeEach(function () {
      simpleFilter = {
        clauses: [
          {
            field: 'subjConcept',
            operand: 'or',
            isNot: false,
            values: ['foo'],
          },
          {
            field: 'objConcept',
            operand: 'or',
            isNot: false,
            values: ['bar'],
          },
        ],
      };
      compoundFilters = {
        clauses: [
          {
            field: 'topic',
            operand: 'or',
            isNot: false,
            values: ['fizz', 'buzz'],
          },
          {
            field: 'objConcept',
            operand: 'or',
            isNot: false,
            values: ['bar'],
          },
          {
            field: 'docPublicationYear',
            operand: 'or',
            isNot: false,
            values: [2011],
          },
        ],
      };
      rangeFilter = {
        clauses: [
          {
            field: 'belief',
            operand: 'or',
            isNot: false,
            values: [[0.5, 0.8]],
          },
        ],
      };
      compoundRangeFilter = {
        clauses: [
          {
            field: 'belief',
            operand: 'or',
            isNot: false,
            values: [
              [0.1, 0.2],
              [0.8, '--'],
            ],
          },
          {
            field: 'objConcept',
            operand: 'or',
            isNot: false,
            values: ['bar'],
          },
        ],
      };
      keywordFilters = {
        clauses: [
          {
            field: 'keyword',
            operand: 'or',
            isNot: false,
            values: ['parent'],
          },
          {
            field: 'objConcept',
            operand: 'or',
            isNot: false,
            values: ['bar'],
          },
        ],
      };
      nestedFilters = {
        clauses: [
          {
            field: 'docPublicationYear',
            operand: 'or',
            isNot: false,
            values: [2011],
          },
        ],
      };
    });
    it('handles empty filters', () => {
      const emptyFilter = {};
      const emptyClause = { clauses: [] };
      const expected = {
        query: {
          bool: {
            must: [EMPTY_ENABLE_FILTER, EMPTY_GENERAL_FILTER],
          },
        },
      };
      expect(queryUtil.buildQuery(emptyFilter)).to.eql(expected);
      expect(queryUtil.buildQuery(emptyClause)).to.eql(expected);
    });
    it('builds simple filter', () => {
      const expectedSimple = {
        query: {
          bool: {
            must: [
              EMPTY_ENABLE_FILTER,
              {
                bool: {
                  must: [
                    {
                      bool: {
                        should: [{ terms: { 'subj.concept.raw': ['foo'] } }],
                      },
                    },
                    {
                      bool: {
                        should: [{ terms: { 'obj.concept.raw': ['bar'] } }],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      };
      expect(queryUtil.buildQuery(simpleFilter)).to.eql(expectedSimple);
    });
    it('builds nested filter', () => {
      const expected = {
        query: {
          bool: {
            must: [EMPTY_ENABLE_FILTER, EMPTY_GENERAL_FILTER, NESTED_PUBLICATION_YEAR_QUERY],
          },
        },
      };
      expect(queryUtil.buildQuery(nestedFilters)).to.eql(expected);
    });
    it('handles malformed filter', () => {
      const malFormedValues = {
        clauses: [
          {
            field: 'subjConcept',
            operand: 'or',
            isNot: false,
            values: 'bazz',
          },
        ],
      };
      expect(() => queryUtil.buildQuery(malFormedValues)).to.throw('Value must be array');
    });
    it('builds Complex', () => {
      const expectedMulti = {
        query: {
          bool: {
            must: [
              EMPTY_ENABLE_FILTER,
              {
                bool: {
                  must: [
                    {
                      bool: {
                        should: [{ terms: { 'wm.topic.raw': ['fizz', 'buzz'] } }],
                      },
                    },
                    {
                      bool: {
                        should: [{ terms: { 'obj.concept.raw': ['bar'] } }],
                      },
                    },
                  ],
                },
              },
              NESTED_PUBLICATION_YEAR_QUERY,
            ],
          },
        },
      };
      expect(queryUtil.buildQuery(compoundFilters)).to.eql(expectedMulti);
    });
    it('builds range query', () => {
      const expectedRange = {
        query: {
          bool: {
            must: [
              EMPTY_ENABLE_FILTER,
              {
                bool: {
                  must: [
                    {
                      bool: {
                        should: [
                          {
                            range: {
                              belief: {
                                gte: 0.5,
                                lt: 0.8,
                              },
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      };
      expect(queryUtil.buildQuery(rangeFilter)).to.eql(expectedRange);
    });
    it('builds complex range query', () => {
      const expectedRange = {
        query: {
          bool: {
            must: [
              EMPTY_ENABLE_FILTER,
              {
                bool: {
                  must: [
                    {
                      bool: {
                        should: [
                          {
                            range: {
                              belief: {
                                gte: 0.1,
                                lt: 0.2,
                              },
                            },
                          },
                          {
                            range: {
                              belief: {
                                gte: 0.8,
                              },
                            },
                          },
                        ],
                      },
                    },
                    {
                      bool: {
                        should: [{ terms: { 'obj.concept.raw': ['bar'] } }],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      };
      expect(queryUtil.buildQuery(compoundRangeFilter)).to.eql(expectedRange);
    });
    it('build regex query', () => {
      const expectedQuery = {
        query: {
          bool: {
            must: [
              EMPTY_ENABLE_FILTER,
              {
                bool: {
                  must: [
                    {
                      bool: {
                        should: [
                          {
                            query_string: {
                              query: 'parent*',
                              fields: ['subj.concept'],
                              default_operator: 'AND',
                            },
                          },
                          {
                            query_string: {
                              query: 'parent*',
                              fields: ['obj.concept'],
                              default_operator: 'AND',
                            },
                          },
                          {
                            query_string: {
                              query: 'parent*',
                              fields: ['subj.factor'],
                              default_operator: 'AND',
                            },
                          },
                          {
                            query_string: {
                              query: 'parent*',
                              fields: ['obj.factor'],
                              default_operator: 'AND',
                            },
                          },
                        ],
                      },
                    },
                    {
                      bool: {
                        should: [
                          {
                            terms: {
                              'obj.concept.raw': ['bar'],
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      };
      expect(queryUtil.buildQuery(keywordFilters)).to.eql(expectedQuery);
    });
    it('builds default global query', () => {
      const defaultGlobal = {
        clauses: [
          {
            field: 'enable',
            operand: 'or',
            isNot: false,
            values: [],
          },
          {
            field: 'objConcept',
            operand: 'or',
            isNot: false,
            values: ['bar'],
          },
        ],
      };
      const expectedQuery = {
        query: {
          bool: {
            must: [
              EMPTY_ENABLE_FILTER,
              {
                bool: {
                  must: [
                    {
                      bool: {
                        should: [
                          {
                            terms: {
                              'obj.concept.raw': ['bar'],
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      };
      expect(queryUtil.buildQuery(defaultGlobal)).to.eql(expectedQuery);
    });
    it('builds no global query', () => {
      const partial = {
        clauses: [
          {
            field: 'enable',
            operand: 'or',
            isNot: false,
            values: ['self-loop', 'staged', 'deleted'],
          },
          {
            field: 'objConcept',
            operand: 'or',
            isNot: false,
            values: ['bar'],
          },
        ],
      };
      const expectedQuery = {
        query: {
          bool: {
            must: [
              {
                bool: {
                  filter: [
                    {
                      terms: {
                        'wm.state': [0, 1, 2, 3],
                      },
                    },
                  ],
                },
              },
              {
                bool: {
                  must: [
                    {
                      bool: {
                        should: [
                          {
                            terms: {
                              'obj.concept.raw': ['bar'],
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      };
      expect(queryUtil.buildQuery(partial)).to.eql(expectedQuery);
    });
    it('builds open-ended query', () => {
      const openEndedFilter = {
        clauses: [
          {
            field: 'numEvidence',
            operand: 'or',
            isNot: false,
            values: [
              [1, 2],
              [5, '--'],
            ],
          },
        ],
      };
      const expectedQuery = {
        query: {
          bool: {
            must: [
              {
                bool: {
                  filter: [
                    {
                      term: {
                        'wm.is_selfloop': false,
                      },
                    },
                    {
                      terms: {
                        'wm.state': [1, 2],
                      },
                    },
                  ],
                },
              },
              {
                bool: {
                  must: [
                    {
                      bool: {
                        should: [
                          {
                            range: {
                              'wm.num_evidence': {
                                gte: 1,
                                lt: 2,
                              },
                            },
                          },
                          {
                            range: {
                              'wm.num_evidence': {
                                gte: 5,
                              },
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      };
      expect(queryUtil.buildQuery(openEndedFilter)).to.eql(expectedQuery);
    });
    it('builds date range query', () => {
      const openEndedFilter = {
        clauses: [
          {
            field: 'startDate',
            operand: 'or',
            isNot: false,
            values: [
              ['2000-01-01', '2010-01-01'],
              ['2018-01-01', '--'],
            ], // null means open ended
          },
        ],
      };
      const expectedQuery = {
        query: {
          bool: {
            must: [
              {
                bool: {
                  filter: [
                    {
                      term: {
                        'wm.is_selfloop': false,
                      },
                    },
                    {
                      terms: {
                        'wm.state': [1, 2],
                      },
                    },
                  ],
                },
              },
              {
                bool: {
                  must: [
                    {
                      bool: {
                        should: [
                          {
                            range: {
                              'subj.time_context.start.date': {
                                gte: '2000-01-01',
                                lt: '2010-01-01',
                              },
                            },
                          },
                          {
                            range: {
                              'subj.time_context.start.date': {
                                gte: '2018-01-01',
                              },
                            },
                          },
                          {
                            range: {
                              'obj.time_context.start.date': {
                                gte: '2000-01-01',
                                lt: '2010-01-01',
                              },
                            },
                          },
                          {
                            range: {
                              'obj.time_context.start.date': {
                                gte: '2018-01-01',
                              },
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      };
      expect(queryUtil.buildQuery(openEndedFilter)).to.eql(expectedQuery);
    });
  });
});
