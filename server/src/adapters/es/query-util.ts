import _ from 'lodash';
import { FIELD_TYPES } from './config';
import moment from 'moment';

export class QueryUtil {
  configFields: Record<string, any>;

  constructor(fields: Record<string, any>) {
    this.configFields = fields;
  }

  _termsBuilder(clause: any): any {
    const { field, values } = clause;
    const esFields = this.configFields[field].aggFields || this.configFields[field].fields;
    const result = esFields.map((f: string) => ({ terms: { [f]: values } }));
    if (clause.isNot === true) return { bool: { must_not: result } };
    return { bool: { should: result } };
  }

  _rangeBuilder(clause: any): any {
    const { field, values } = clause;
    const fieldMeta = this.configFields[field];
    const esFields = fieldMeta.fields;
    const queries: any[] = [];
    esFields.forEach((esField: string) => {
      values.forEach((range: any[]) => {
        const resultRange: any = {};
        if (range[0] !== '--') resultRange.gte = range[0];
        if (range[1] !== '--') resultRange.lt = range[1];
        queries.push({ range: { [esField]: resultRange } });
      });
    });
    if (clause.isNot === true) return { bool: { must_not: queries } };
    return { bool: { should: queries } };
  }

  _dateToEpochMillis(clause: any): any {
    const { values } = clause;
    values.forEach((range: any[]) => {
      if (range[0] !== '--') range[0] = moment.utc(range[0].toString()).valueOf();
      if (range[1] !== '--') range[1] = moment.utc(range[1].toString()).valueOf();
    });
    return clause;
  }

  _regexBuilder(clause: any): any {
    const { field, values } = clause;
    const fieldMeta = this.configFields[field];
    const esFields = fieldMeta.fields;
    const queries: any[] = [];
    esFields.forEach((f: string) => {
      values.forEach((value: string) => {
        queries.push({
          query_string: {
            query: `${value}*`,
            fields: [f],
            default_operator: 'AND',
          },
        });
      });
    });
    if (clause.isNot === true) return { bool: { must_not: queries } };
    return { bool: { should: queries } };
  }

  _qualityFilterBuilder(clause: any): any {
    const values = clause.values;
    const isVetted = values.includes('Vetted');
    const isEdited = values.includes('Edited');
    const isUnevaluated = values.includes('Not Evaluated');
    const queries: any[] = [];
    if (isVetted) queries.push({ term: { 'wm.state': 2 } });
    if (isEdited) queries.push({ term: { 'wm.edited': 1 } });
    if (isUnevaluated) {
      queries.push({
        bool: { filter: [{ term: { 'wm.edited': 0 } }, { term: { 'wm.state': 1 } }] },
      });
    }
    if (clause.isNot === true) return { bool: { must_not: queries } };
    return { bool: { should: queries } };
  }

  _validClauseCheck(clause: any): void {
    const { values } = clause;
    if (!_.isArray(values)) {
      throw new Error('Value must be array');
    }
  }

  levelFilter(clauses: any[], documentLevel: number): any[] {
    return clauses.filter((clause) => {
      let fieldType;
      if (!_.isNil(clause)) {
        const fieldMeta = this.configFields[clause.field];
        fieldType = fieldMeta.level;
      }
      return fieldType === documentLevel;
    });
  }

  _translateFilters(clauses: any[]): any[] {
    const translatedFilters: any[] = [];
    clauses.forEach((clause) => {
      this._validClauseCheck(clause);
      const field = clause.field;
      const fieldMeta = this.configFields[field];
      let filter: any;
      if (fieldMeta.type === FIELD_TYPES._QUALITY) {
        filter = this._qualityFilterBuilder(clause);
      } else if (fieldMeta.type === FIELD_TYPES.RANGED || fieldMeta.type === FIELD_TYPES.DATE) {
        filter = this._rangeBuilder(clause);
      } else if (fieldMeta.type === FIELD_TYPES.DATE_MILLIS) {
        filter = this._rangeBuilder(this._dateToEpochMillis(clause));
      } else if (fieldMeta.type === FIELD_TYPES.NORMAL) {
        filter = this._termsBuilder(clause);
      } else if (fieldMeta.type === FIELD_TYPES.REGEXP) {
        filter = this._regexBuilder(clause);
      }
      translatedFilters.push(filter);
    });
    return translatedFilters;
  }

  buildFilters(clauses: any[]): any {
    if (_.isEmpty(clauses)) {
      return { bool: { filter: [{ match_all: {} }] } };
    }
    const translatedFilters = this._translateFilters(clauses);
    return { bool: { must: translatedFilters } };
  }

  buildNestedFilters(clauses: any[], nestedPath: string): any {
    if (_.isEmpty(clauses)) return null;
    const translatedFilters = this._translateFilters(clauses);
    return { nested: { path: nestedPath, query: translatedFilters } };
  }
}
