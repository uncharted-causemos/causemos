import {
  Lex,
  TransitionFactory,
  ValueState,
  LabelState,
  ValueStateValue,
} from '@uncharted.software/lex/dist/lex';
import NumericBetweenState from '@/search/numeric-between-state';
import MappedOptionState from '@/search/mapped-option-state';

import BasePill from '@/search/pills/base-pill';
import filtersUtil from '@/utils/filters-util';
import lexUtil from '@/search/lex-util';

const NUM_EVIDENCE_START_LIST = ['1', '2', '3', '4', '5'];
const NUM_EVIDENCE_END_LIST = ['1', '2', '3', '4', '5', '5+'];

export default class NumEvidencePill extends BasePill {
  constructor(config) {
    super(config);
    // Create start range suggestion list
    this.branchStartConfig = lexUtil.dynamicSimpleSuggestionBuilder(
      'Select # of evidence pieces',
      false,
      () => NUM_EVIDENCE_START_LIST
    );
    // Create end range suggestion list
    this.branchEndConfig = lexUtil.dynamicSimpleSuggestionBuilder(
      'Select # of evidence pieces',
      false,
      () => NUM_EVIDENCE_END_LIST
    );
  }

  makeBranch() {
    return Lex.from(
      'relation',
      NumericBetweenState,
      TransitionFactory.valueMetaCompare({ searchKey: this.searchKey })
    ).branch(
      Lex.from('value', ValueState, this.branchStartConfig, TransitionFactory.valueKeyIs('between'))
        .to(LabelState, { label: 'and' })
        .to('secondaryValue', MappedOptionState, this.branchEndConfig)
    );
  }

  lex2Filters(lexItem, filters) {
    const relation = lexItem.relation.key;
    const operand = 'or';
    const isNot = relation === 'not';
    const primaryValue = lexItem.value.key;
    let secondaryValue = lexItem.secondaryValue.key;
    // For open-ended end range selection
    secondaryValue = secondaryValue === '5+' ? 6 : secondaryValue;
    filtersUtil.addSearchTerm(
      filters,
      this.searchKey,
      [+primaryValue, +secondaryValue],
      operand,
      isNot
    );
  }

  /**
   * Convert filter query to lex query
   * @param {object} clause - filter clause
   * @param {object} selectedPill - A rich lex compatible object that contains the value and associated meta
   * @param {array} lexQuery
   */
  filters2Lex(clause, selectedPill, lexQuery) {
    const values = clause.values;
    const primaryValue = values[0][0];
    let secondaryValue = values[0][1];
    // For open-ended end range selection
    secondaryValue = secondaryValue === 6 ? '5+' : secondaryValue;
    lexQuery.push({
      field: selectedPill,
      relation: NumericBetweenState.BETWEEN,
      value: new ValueStateValue(primaryValue),
      secondaryValue: new ValueStateValue(secondaryValue),
    });
  }
}
