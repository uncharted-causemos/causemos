import _ from 'lodash';

/**
 * Formats ontology of the form /a/b/c
 */
export default function (value: string | null) {
  if (!value || value === '') return 'Unknown';
  return _.last(value.split('/'))?.replace(/_/g, ' ');
}
