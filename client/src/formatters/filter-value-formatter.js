import _ from 'lodash';
import CodeUtil from '@/utils/code-util';
import polarityFormatter from '@/formatters/polarity-formatter';
import statementPolarityFormatter from '@/formatters/statement-polarity-formatter';
import hedgingCategoryFormatter from '@/formatters/hedging-category-formatter';
import contradictionCategoryFormatter from '@/formatters/contradiction-category-formatter';
import ontologyFormatter from '@/formatters/ontology-formatter';

const FIELDS = CodeUtil.FIELDS;
const FIELDS_INVERSE = _.invert(CodeUtil.FIELDS);

const ONTOLOGY_FIELDS = [
  FIELDS.TOPIC, FIELDS.SUBJ_CONCEPT, FIELDS.OBJ_CONCEPT
];

/**
 * Transform a filter value to human-readable format for the UI.
 * For example:
 *   key = polarity and value = -1, will yield 'Opposite'
 *   key = score and value = [0.1, 0.3] will yield '0.1 to 0.3'
 *
 * Note this is a higher level formatter that uses other basic formatters.
 *
 * @param {Object|String|Array} value - a filter value representation
 * @param {string} key - a field key
 *
 */
export default function (value, key) {
  const entry = CodeUtil.CODE_TABLE[FIELDS_INVERSE[key]];
  if (!entry || !entry.display) return value;

  if (entry.ranged) {
    return value[0] + ' to ' + value[1];
  } else {
    if (entry.field === FIELDS.POLARITY) {
      return polarityFormatter(value);
    } else if (entry.field === FIELDS.STATEMENT_POLARITY) {
      return statementPolarityFormatter(value);
    } else if (entry.field === FIELDS.HEDGING_CATEGORY) {
      return hedgingCategoryFormatter(value);
    } else if (entry.field === FIELDS.CONTRADICTION_CATEGORY) {
      return contradictionCategoryFormatter(value);
    } else if (ONTOLOGY_FIELDS.includes(entry.field)) {
      return ontologyFormatter(value);
    }
  }

  // Default
  return value;
}
