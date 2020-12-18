import { Lex, TransitionFactory, ValueState, ValueStateValue, NumericEntryState, LabelState } from '@uncharted.software/lex/dist/lex';
import BasePill from '@/search/pills/base-pill';
import SingleRelationState from '@/search/single-relation-state';
import lexUtil from '@/utils/lex-util';
import filtersUtil from '@/utils/filters-util';

export default class InterventionPathPill extends BasePill {
  constructor(config, suggestionFn, msg) {
    super(config);
    this.branchConfig = lexUtil.dynamicSimpleSuggestionBuilder(msg, true, suggestionFn);
  }

  makeBranch() {
    return Lex.from('relation', SingleRelationState, TransitionFactory.valueMetaCompare({ searchKey: this.searchKey }))
      .to('value', NumericEntryState, { name: 'Enter number of hops (1-3)' })
      .to(LabelState, { label: 'hops away from' })
      .to('secondaryValue', ValueState, this.branchConfig);
  }

  lex2Filters(lexItem, filters) {
    const searchKey = lexItem.field.meta.searchKey;
    const relation = lexItem.relation.key;
    const operand = 'or';
    const isNot = (relation === 'not');
    const values = [
      { nodes: lexItem.secondaryValue.map(d => d.key), hops: +lexItem.value.key }
    ];
    values.forEach(v => {
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
    values.forEach(v => {
      lexQuery.push({
        field: selectedPill,
        relation: SingleRelationState.IS,
        value: new ValueStateValue(v.hops),
        secondaryValue: v.nodes.map(n => new ValueStateValue(n, {}, { displayKey: this.displayFormatter(n) }))
      });
    });
  }
}
