import { ValueStateValue } from '@uncharted.software/lex/dist/lex';

import BinaryRelationState from '@/search/binary-relation-state';

import filtersUtil from '@/utils/filters-util';
import lexUtil from '@/search/lex-util';

export default class BasePill {
  /**
   * @param {object} config - a CodeTable entry that defines a field configuration
   */
  constructor(config) {
    this.searchDisplay = config.searchDisplay;
    this.searchKey = config.field;
    this.baseType = config.baseType;
    this.lexType = config.lexType;
    this.icon = config.icon || null;
    this.iconText = config.iconText || '';

    this.displayFormatter = (v) => v; // default pass-thru
  }

  makeOption() {
    return new ValueStateValue(this.searchDisplay, {
      searchKey: this.searchKey,
    });
  }

  makeIcon() {
    if (this.icon) {
      return `<i class="fa ${this.icon}">${this.iconText}</i>`;
    }
    return '<i class="fa fa-search"></i>';
  }

  makeBranch() {
    throw new Error('Must be implemented by child');
  }

  /**
   * Set display formatter
   * @param {function} formatter - formatter function
   */
  setFormatter(formatter) {
    this.displayFormatter = formatter;
  }

  lex2Filters(lexItem, filters) {
    const searchKey = lexItem.field.meta.searchKey;
    const relation = lexItem.relation.key;
    const operand = 'or';
    const isNot = relation === 'not';
    const values = lexUtil.convertFromLex(lexItem.value, this.baseType);
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
    const values = lexUtil.convertToLex(clause.values, this.lexType);
    const isNot = clause.isNot;
    lexQuery.push({
      field: selectedPill,
      relation: isNot === true ? BinaryRelationState.IS_NOT : BinaryRelationState.IS,
      value: values.map(
        (v) => new ValueStateValue(v, {}, { displayKey: this.displayFormatter(v) })
      ),
    });
  }
}
