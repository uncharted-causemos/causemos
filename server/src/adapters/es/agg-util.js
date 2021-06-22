const moment = require('moment');

const DEFAULT_SIZE = 300; // set reasonable default size

class AggUtil {
  constructor(fields) {
    this.configFields = fields;
  }

  termsAggregation(facetField) {
    const fields = this.configFields[facetField].aggFields || this.configFields[facetField].fields;
    const result = {
      terms: {
        size: DEFAULT_SIZE,
        field: fields[0]
      }
    };
    return result;
  }

  rangeAggregation(facetField) {
    const { range } = this.configFields[facetField];
    const fields = this.configFields[facetField].aggFields || this.configFields[facetField].fields;
    const ranges = range.map((rangeBucket) => {
      const { from, to } = rangeBucket;
      const result = { key: from.toString() };
      if (from !== '--') {
        result.from = from;
      }
      if (to !== '--') {
        result.to = to;
      }
      return result;
    });

    return {
      range: {
        field: fields[0],
        ranges
      }
    };
  }

  /**
   * Aggregate dates into year buckets
   * @param {string} field - field to aggregate by
   *
   * Note: we are unsure of how to make use of date aggregations yet in Causemos
   * and would require further refinement depending on how we'd like to aggregate the statement by dates - June 15th 2020
   */
  dateRangeAggregation(facetField) {
    const { range } = this.configFields[facetField];
    const fields = this.configFields[facetField].aggFields || this.configFields[facetField].fields;
    const subAggregation = {};
    range.forEach(dates => {
      const startYear = dates.from;
      const endYear = dates.to;
      const dateAggs = [];
      // build date field range filters;
      fields.forEach(f => {
        const resultRange = {};
        if (startYear !== '--') {
          const startDate = moment.utc([startYear]).format('YYYY-MM-DD'); // first day of the year
          resultRange.gte = startDate;
        }
        if (endYear !== '--') {
          const endDate = moment.utc([endYear]).subtract(1, 'days').format('YYYY-MM-DD'); // last day of the previous year
          resultRange.lte = endDate;
        }
        dateAggs.push({
          range: {
            [f]: resultRange
          }
        });
      });
      subAggregation[startYear] = {
        bool: {
          should: dateAggs
        }
      };
    });
    const result = {
      filters: {
        filters: subAggregation
      }
    };
    return result;
  }
}

module.exports = { AggUtil };
