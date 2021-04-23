import _ from 'lodash';
import CodeUtil from '@/utils/code-util';

const FIELDS_INVERSE = _.invert(CodeUtil.FIELDS);

/**
 * Transform a filter key to human-readable format for the UI.
 * For example:
 *  topic => "Concept"
 *
 * @param {string} key - a field key
 */
export default function (key: string) {
  const entry = CodeUtil.CODE_TABLE[FIELDS_INVERSE[key]];
  if (!entry || !entry.display) return key;
  return entry.display;
}
