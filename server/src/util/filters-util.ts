import _ from 'lodash';

export const parse = (v: any) => {
  const filters = { clauses: [] };

  if (!_.isEmpty(v)) {
    if (_.isString(v)) {
      return JSON.parse(v);
    }
    return v;
  }
  return filters;
};

export const isEmpty = (filters: any): boolean => {
  return _.isEmpty(filters) || _.isEmpty(filters.clauses);
};

export const findFilter = (filters: any, filterName: string) => {
  const clauses = _.get(filters, 'clauses') || [];
  return clauses.find((clause: any) => clause.field === filterName);
};
