/* eslint-disable no-unused-expressions */

import FiltersUtil from '@/utils/filters-util';
import { Filters } from '@/types/Filters';

describe('filters-util', () => {
  let FILTERS: Filters = { clauses: [] };

  beforeEach(() => {
    FILTERS = {
      clauses: [
        {
          field: 'xyz',
          values: [1, 2, 3, 4],
          isNot: false,
          operand: 'or',
        },
      ],
    };
  });

  it('search for positive/negative clause by field', () => {
    const p = FiltersUtil.findPositiveFacetClause(FILTERS, 'xyz');
    const n = FiltersUtil.findPositiveFacetClause(FILTERS, 'abc');
    expect(p).to.exist;
    expect(n).to.not.exist;
  });

  it('add new field term', () => {
    FiltersUtil.addSearchTerm(FILTERS, 'abc', 'test-1', 'or', false);
    expect(FILTERS.clauses.length).to.equal(2);

    FiltersUtil.addSearchTerm(FILTERS, 'abc', 'test-2', 'or', false);
    expect(FILTERS.clauses.length).to.equal(2);

    const justAdded = FiltersUtil.findPositiveFacetClause(FILTERS, 'abc');
    expect(justAdded && justAdded.values.length).to.equal(2);
  });

  it('remove field clause by term', () => {
    /* Add stuff */
    FiltersUtil.addSearchTerm(FILTERS, 'abc', 'test-1', 'or', false);
    FiltersUtil.addSearchTerm(FILTERS, 'abc', 'test-2', 'or', false);
    expect(FILTERS.clauses.length).to.equal(2);

    /* Remove xyz */
    FiltersUtil.removeSearchTerm(FILTERS, 'xyz', 1, 'or', false);
    FiltersUtil.removeSearchTerm(FILTERS, 'xyz', 2, 'or', false);
    FiltersUtil.removeSearchTerm(FILTERS, 'xyz', 3, 'or', false);
    FiltersUtil.removeSearchTerm(FILTERS, 'xyz', 4, 'or', false);
    expect(FILTERS.clauses.length).to.equal(1);

    /* Remove abc */
    FiltersUtil.removeSearchTerm(FILTERS, 'abc', 'test-1', 'or', false);
    FiltersUtil.removeSearchTerm(FILTERS, 'abc', 'test-2', 'or', false);
    expect(FILTERS.clauses.length).to.equal(0);
  });

  it('remove field clause by clause', () => {
    /* Add stuff */
    FiltersUtil.addSearchTerm(FILTERS, 'abc', 'test-1', 'or', false);
    FiltersUtil.addSearchTerm(FILTERS, 'abc', 'test-2', 'or', false);
    expect(FILTERS.clauses.length).to.equal(2);

    FiltersUtil.removeClause(FILTERS, 'abc', 'or', false);
    expect(FILTERS.clauses.length).to.equal(1);

    FiltersUtil.removeClause(FILTERS, 'xyz', 'or', false);
    expect(FILTERS.clauses.length).to.equal(0);
  });

  it('check correctly empty', () => {
    FiltersUtil.removeClause(FILTERS, 'xyz', 'or', false);
    expect(FiltersUtil.isEmpty(FILTERS)).to.equal(true);

    FiltersUtil.addSearchTerm(FILTERS, 'abc', 'test-1', 'or', false);
    expect(FiltersUtil.isEmpty(FILTERS)).to.equal(false);
  });

  it('check if clause is empty', () => {
    FiltersUtil.setClause(FILTERS, 'abc', [], 'or', false);
    const nonEmptyClause = FiltersUtil.findPositiveFacetClause(FILTERS, 'xyz');
    const emptyClause = FiltersUtil.findPositiveFacetClause(FILTERS, 'abc');
    expect(FiltersUtil.isEmptyClause(emptyClause)).to.equal(true);
    expect(FiltersUtil.isEmptyClause(nonEmptyClause)).to.equal(false);
    FiltersUtil.removeClause(FILTERS, 'xyz', 'or', false);
    const justRemoved = FiltersUtil.findPositiveFacetClause(FILTERS, 'xyz');
    expect(FiltersUtil.isEmptyClause(justRemoved)).to.equal(true);
  });

  it('check filters equivalence', () => {
    const A: Filters = {
      clauses: [
        { field: 'xyz', isNot: false, operand: 'or', values: [1, 2, 3] },
        { field: 'abc', isNot: true, operand: 'or', values: [1, 2, 3] },
      ],
    };
    const B: Filters = {
      clauses: [
        { field: 'abc', isNot: true, operand: 'or', values: [1, 2, 3] },
        { field: 'xyz', isNot: false, operand: 'or', values: [1, 2, 3] },
      ],
    };
    const C: Filters = {
      clauses: [
        { field: 'xyz', isNot: false, operand: 'or', values: [1, 2, 3] },
        { field: 'abc', isNot: true, operand: 'or', values: [7, 8, 9] },
      ],
    };

    expect(FiltersUtil.isEqual(A, B)).to.equal(true);
    expect(FiltersUtil.isEqual(A, C)).to.equal(false);
  });

  it('check clause equivalence', () => {
    const A: Filters = {
      clauses: [
        { field: 'xyz', isNot: false, operand: 'or', values: [1, 2, 3] },
        { field: 'abc', isNot: true, operand: 'or', values: [1, 2, 3] },
      ],
    };
    const B: Filters = {
      clauses: [
        { field: 'abc', isNot: true, operand: 'or', values: [1, 2, 3] },
        { field: 'xyz', isNot: false, operand: 'or', values: [2, 3, 4] },
      ],
    };
    const C: Filters = {
      clauses: [
        { field: 'xyz', isNot: false, operand: 'or', values: [1, 2, 3] },
        { field: 'abc', isNot: false, operand: 'or', values: [1, 2, 3] },
        { field: 'foo', isNot: false, operand: 'or', values: ['bar'] },
      ],
    };
    const D: Filters = {
      clauses: [
        { field: 'xyz', isNot: true, operand: 'or', values: [1, 2, 3] },
        { field: 'xyz', isNot: false, operand: 'or', values: [1, 2, 3] },
      ],
    };
    expect(FiltersUtil.isClauseEqual(A, B, 'xyz', false)).to.equal(false);
    expect(FiltersUtil.isClauseEqual(A, C, 'xyz', false)).to.equal(true);
    expect(FiltersUtil.isClauseEqual(A, D, 'xyz', false)).to.equal(true);
  });
});
