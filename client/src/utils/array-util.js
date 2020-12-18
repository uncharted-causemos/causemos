import _ from 'lodash';

const onlyUnique = function(value, index, self) {
  return self.indexOf(value) === index;
};

const uniq = function(array) {
  return array.filter(onlyUnique);
};

const isSubset = function(subset, superset) {
  return subset.some(val => _.includes(superset, val));
};

export default {
  uniq,
  isSubset
};
