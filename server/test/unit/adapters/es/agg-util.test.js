const expect = require('chai').expect;
const { FIELDS } = require('#@/adapters/es/config.js');
const { AggUtil } = require('#@/adapters/es/agg-util.js');
const aggUtil = new AggUtil(FIELDS);

describe('agg-util', function () {
  describe('buildAggregation', function () {
    it('handles basic terms aggregation', () => {
      const expectedAggregation = {
        terms: {
          size: 300,
          field: 'subj.concept.raw',
        },
      };
      expect(aggUtil.termsAggregation('subjConcept')).to.eql(expectedAggregation);
    });

    it('handles basic range aggregation', () => {
      const expectedAggregation = {
        range: {
          field: 'belief',
          ranges: [
            { key: '0', from: 0, to: 0.1 },
            { key: '0.1', from: 0.1, to: 0.2 },
            { key: '0.2', from: 0.2, to: 0.3 },
            { key: '0.3', from: 0.3, to: 0.4 },
            { key: '0.4', from: 0.4, to: 0.5 },
            { key: '0.5', from: 0.5, to: 0.6 },
            { key: '0.6', from: 0.6, to: 0.7 },
            { key: '0.7', from: 0.7, to: 0.8 },
            { key: '0.8', from: 0.8, to: 0.9 },
            { key: '0.9', from: 0.9 },
          ],
        },
      };
      expect(aggUtil.rangeAggregation('belief')).to.eql(expectedAggregation);
    });

    it('handles open range aggregation', () => {
      const expectedAggregation = {
        range: {
          field: 'wm.num_evidence',
          ranges: [
            { key: '1', from: 1, to: 2 },
            { key: '2', from: 2, to: 3 },
            { key: '3', from: 3, to: 4 },
            { key: '4', from: 4, to: 5 },
            { key: '5', from: 5 },
          ],
        },
      };
      expect(aggUtil.rangeAggregation('numEvidence')).to.eql(expectedAggregation);
    });

    it('handles date range aggregation', () => {
      const expectedAggregation = {
        filters: {
          filters: {
            1990: {
              bool: {
                should: [
                  {
                    range: {
                      'subj.time_context.start.date': {
                        gte: '1990-01-01',
                        lte: '1994-12-31',
                      },
                    },
                  },
                  {
                    range: {
                      'obj.time_context.start.date': {
                        gte: '1990-01-01',
                        lte: '1994-12-31',
                      },
                    },
                  },
                ],
              },
            },
            1995: {
              bool: {
                should: [
                  {
                    range: {
                      'subj.time_context.start.date': {
                        gte: '1995-01-01',
                        lte: '1999-12-31',
                      },
                    },
                  },
                  {
                    range: {
                      'obj.time_context.start.date': {
                        gte: '1995-01-01',
                        lte: '1999-12-31',
                      },
                    },
                  },
                ],
              },
            },
            2000: {
              bool: {
                should: [
                  {
                    range: {
                      'subj.time_context.start.date': {
                        gte: '2000-01-01',
                        lte: '2004-12-31',
                      },
                    },
                  },
                  {
                    range: {
                      'obj.time_context.start.date': {
                        gte: '2000-01-01',
                        lte: '2004-12-31',
                      },
                    },
                  },
                ],
              },
            },
            2005: {
              bool: {
                should: [
                  {
                    range: {
                      'subj.time_context.start.date': {
                        gte: '2005-01-01',
                        lte: '2009-12-31',
                      },
                    },
                  },
                  {
                    range: {
                      'obj.time_context.start.date': {
                        gte: '2005-01-01',
                        lte: '2009-12-31',
                      },
                    },
                  },
                ],
              },
            },
            2010: {
              bool: {
                should: [
                  {
                    range: {
                      'subj.time_context.start.date': {
                        gte: '2010-01-01',
                      },
                    },
                  },
                  {
                    range: {
                      'obj.time_context.start.date': {
                        gte: '2010-01-01',
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      };
      expect(aggUtil.dateRangeAggregation('startDate')).to.eql(expectedAggregation);
    });

    it('handles minimum grounding score aggregation', () => {
      const expectedAggregation = {
        range: {
          field: 'wm.min_grounding_score',
          ranges: [
            { key: '0', from: 0, to: 0.1 },
            { key: '0.1', from: 0.1, to: 0.2 },
            { key: '0.2', from: 0.2, to: 0.3 },
            { key: '0.3', from: 0.3, to: 0.4 },
            { key: '0.4', from: 0.4, to: 0.5 },
            { key: '0.5', from: 0.5, to: 0.6 },
            { key: '0.6', from: 0.6, to: 0.7 },
            { key: '0.7', from: 0.7, to: 0.8 },
            { key: '0.8', from: 0.8, to: 0.9 },
            { key: '0.9', from: 0.9 },
          ],
        },
      };
      expect(aggUtil.rangeAggregation('minGroundingScore')).to.eql(expectedAggregation);
    });
  });
});
