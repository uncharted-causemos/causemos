import _ from 'lodash';

export const UNKNOWN = 'Unknown';

export function conceptShortName(name) {
  if (_.isNil(name)) return '';

  const nameArray = name.split('/');
  return nameArray.pop().replace(/_/g, ' ');
}

export function conceptPrefix(concept) {
  return concept.split('/').splice(0, 3).join('/').replace(/_/g, ' ');
}

export function conceptSuffix(concept) {
  return concept.split('/').splice(3).join('/').replace(/_/g, ' ');
}

export default {
  UNKNOWN,
  conceptShortName,
  conceptPrefix,
  conceptSuffix
};
