const _ = require('lodash');

const parse = (v) => {
  const filters = { clauses: [] };

  if (!_.isEmpty(v)) {
    if (_.isString(v)) {
      return JSON.parse(v);
    }
    return v;
  }
  return filters;
};

const isEmpty = (filters) => {
  return _.isEmpty(filters) || _.isEmpty(filters.clauses);
};

const findFilter = (filters, filterName) => {
  const clauses = _.get(filters, 'clauses') || [];
  return clauses.find((clause) => clause.field === filterName);
};

module.exports = {
  parse,
  isEmpty,
  findFilter,
};
