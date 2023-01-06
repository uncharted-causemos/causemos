import { Lex, TransitionFactory, ValueStateValue } from '@uncharted.software/lex/dist/lex';
import BasePill from '@/search/pills/base-pill';
import SingleRelationState from '@/search/single-relation-state';
import MappedOptionState from '@/search/mapped-option-state';
import lexUtil from '@/search/lex-util';

/**
 * Used for key-value mappings that can change during the user session.
 * For example subgraph which can be added/removed
 */
export default class DynamicKeyValuePill extends BasePill {
  constructor(config, mapFn, msg) {
    super(config);
    this.branchConfig = lexUtil.dynamicMappedSuggestionBuilder(msg, true, mapFn);
    this.keyMap = mapFn();
  }

  makeBranch() {
    return Lex.from(
      'relation',
      SingleRelationState,
      TransitionFactory.valueMetaCompare({ searchKey: this.searchKey })
    ).to('value', MappedOptionState, this.branchConfig);
  }

  /**
   * Convert filter query to lex query
   * @param {object} clause - filter clause
   * @param {object} selectedPill - A rich lex compatible object that contains the value and associated meta
   * @param {array} lexQuery
   */
  filters2Lex(clause, selectedPill, lexQuery) {
    lexQuery.push({
      field: selectedPill,
      relation: SingleRelationState.IS,
      value: clause.values.map(
        (v) => new ValueStateValue(v, {}, { displayKey: this.displayFormatter(this.keyMap[v]) })
      ),
    });
  }
}
