import {
  Lex,
  TransitionFactory,
  NumericEntryState,
  LabelState,
  ValueStateValue,
} from '@uncharted.software/lex/dist/lex';
import NumericBetweenState from '@/search/numeric-between-state';

import BasePill from '@/search/pills/base-pill';
import filtersUtil from '@/utils/filters-util';

export default class RangePill extends BasePill {
  makeBranch() {
    return Lex.from(
      'relation',
      NumericBetweenState,
      TransitionFactory.valueMetaCompare({ searchKey: this.searchKey })
    ).branch(
      Lex.from('value', NumericEntryState, TransitionFactory.valueKeyIs('between'))
        .to(LabelState, { label: 'and' })
        .to('secondaryValue', NumericEntryState)
    );
  }

  lex2Filters(lexItem, filters) {
    const relation = lexItem.relation.key;
    const operand = 'or';
    const isNot = relation === 'not';
    const primaryValue = lexItem.value.key;
    const secondaryValue = lexItem.secondaryValue.key;
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
    const secondaryValue = values[0][1];

    lexQuery.push({
      field: selectedPill,
      relation: NumericBetweenState.BETWEEN,
      value: new ValueStateValue(values[0][0]),
      secondaryValue: new ValueStateValue(secondaryValue),
    });
  }
}
