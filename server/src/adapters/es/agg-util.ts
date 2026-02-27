import moment from 'moment';

const DEFAULT_SIZE = 300;

export class AggUtil {
  configFields: Record<string, any>;

  constructor(fields: Record<string, any>) {
    this.configFields = fields;
  }

  termsAggregation(facetField: string): any {
    const fields = this.configFields[facetField].aggFields || this.configFields[facetField].fields;
    return {
      terms: {
        size: DEFAULT_SIZE,
        field: fields[0],
      },
    };
  }

  rangeAggregation(facetField: string): any {
    const { range } = this.configFields[facetField];
    const fields = this.configFields[facetField].aggFields || this.configFields[facetField].fields;
    const ranges = range.map((rangeBucket: any) => {
      const { from, to } = rangeBucket;
      const result: any = { key: from.toString() };
      if (from !== '--') result.from = from;
      if (to !== '--') result.to = to;
      return result;
    });

    return {
      range: {
        field: fields[0],
        ranges,
      },
    };
  }

  dateRangeAggregation(facetField: string, isEpochMillis = false): any {
    const { range } = this.configFields[facetField];
    const fields = this.configFields[facetField].aggFields || this.configFields[facetField].fields;
    const subAggregation: Record<string, any> = {};
    range.forEach((dates: any) => {
      const startYear = dates.from;
      const endYear = dates.to;
      const dateAggs: any[] = [];
      fields.forEach((f: string) => {
        const resultRange: any = {};
        if (startYear !== '--') {
          const startDate = moment.utc([startYear]);
          resultRange.gte = isEpochMillis ? startDate.valueOf() : startDate.format('YYYY-MM-DD');
        }
        if (endYear !== '--') {
          const endDate = moment.utc([endYear]).subtract(1, 'days');
          resultRange.lte = isEpochMillis ? endDate.valueOf() : endDate.format('YYYY-MM-DD');
        }
        dateAggs.push({ range: { [f]: resultRange } });
      });
      subAggregation[startYear] = { bool: { should: dateAggs } };
    });
    return {
      filters: {
        filters: subAggregation,
      },
    };
  }
}
