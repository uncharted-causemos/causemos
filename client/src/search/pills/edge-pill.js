import {
  Lex,
  TransitionFactory,
  ValueState,
  ValueStateValue,
  LabelState,
} from '@uncharted.software/lex/dist/lex';
import BasePill from '@/search/pills/base-pill';
import edgeRelationState from '@/search/edge-relation-state';
import lexUtil from '@/search/lex-util';
import filtersUtil from '@/utils/filters-util';

export default class EdgePill extends BasePill {
  constructor(config, suggestionFn, msg) {
    super(config);
    this.branchConfig = lexUtil.dynamicSimpleSuggestionBuilder(msg, false, suggestionFn);
    this.branchSecondaryConfig = lexUtil.dynamicSimpleSuggestionBuilder(msg, false, suggestionFn);
  }

  makeBranch() {
    return Lex.from(
      'relation',
      edgeRelationState,
      TransitionFactory.valueMetaCompare({ searchKey: this.searchKey })
    )
      .to('value', ValueState, this.branchConfig, { name: 'Enter cause concept' })
      .to(LabelState, { label: 'to' })
      .to('secondaryValue', ValueState, this.branchSecondaryConfig, {
        name: 'Enter effect concept',
      });
  }

  lex2Filters(lexItem, filters) {
    const searchKey = lexItem.field.meta.searchKey;
    const relation = lexItem.relation.key;
    const operand = 'or';
    const isNot = relation === 'not';
    const values = [`${lexItem.value.key}///${lexItem.secondaryValue.key}`];
    values.forEach((v) => {
      filtersUtil.addSearchTerm(filters, searchKey, v, operand, isNot);
    });
  }

  /**
   * Convert filter query to lex query
   * @param {object} clause - filter clause
   * @param {object} selectedPill - A rich lex compatible object that contains the value and associated meta
   * @param {array} lexQuery
   */
  filters2Lex(clause, selectedPill, lexQuery) {
    const values = clause.values;
    values.forEach((v) => {
      const split = v.split('///');
      lexQuery.push({
        field: selectedPill,
        relation: edgeRelationState.SOURCE_IS,
        value: new ValueStateValue(split[0], {}, { displayKey: this.displayFormatter(split[0]) }),
        secondaryValue: new ValueStateValue(
          split[1],
          {},
          { displayKey: this.displayFormatter(split[1]) }
        ),
      });
    });
  }
}
