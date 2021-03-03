import _ from 'lodash';

/**
 * Formats list of values
 */
export default function (value) {
  if (!value || _.isEmpty(value)) return 'n/a';
  if (!_.isArray(value)) return value;
  return value.join(', ');
}
