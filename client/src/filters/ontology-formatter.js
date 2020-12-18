import _ from 'lodash';
import ConceptUtil from '@/utils/concept-util';

/**
 * Formats ontology of the form /a/b/c
 */
export default function (value) {
  if (!value || value === '') return 'Unknown';
  const interventionMark = ConceptUtil.isInterventionNode(value) ? '*' : '';
  return (interventionMark + _.last(value.split('/')).replace(/_/g, ' '));
}
