import _ from 'lodash';

/**
 * Formats ontology of the form /a/b/c
 */
export default function (value) {
  if (!value || value === '') return 'Unknown';
  return _.last(value.split('/')).replace(/_/g, ' ');
}
