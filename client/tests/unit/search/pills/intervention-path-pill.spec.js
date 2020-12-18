import { expect } from 'chai';
import InterventionPathPill from '@/search/pills/intervention-path-pill';
import FiltersUtil from '@/utils/filters-util';

const F_ONE = {
  clauses: [{
    field: 'dummy',
    operand: 'or',
    isNot: false,
    values: [{ hops: 5, nodes: ['abc', 'def'] }]
  }]
};

const F_MULTI = {
  clauses: [{
    field: 'dummy',
    operand: 'or',
    isNot: false,
    values: [
      { hops: 5, nodes: ['abc', 'def'] },
      { hops: 2, nodes: ['xyz', 'zzz'] }]
  }]
};


const model1 = {
  field: { key: 'dummy', meta: { searchKey: 'dummy' } },
  relation: { key: 'is' },
  value: { key: 5 },
  secondaryValue: [
    { key: 'abc' },
    { key: 'def' }
  ]
};

const model2 = {
  field: { key: 'dummy', meta: { searchKey: 'dummy' } },
  relation: { key: 'is' },
  value: { key: 2 },
  secondaryValue: [
    { key: 'xyz' },
    { key: 'zzz' }
  ]
};

describe('intervention-path-pill', () => {
  let pill = null;

  beforeEach(() => {
    pill = new InterventionPathPill({
      field: 'dummy',
      display: 'dummy',
      searchDisplay: 'dummy',
      searchable: true,
      ranged: false
    }, [], 'test');
  });

  it('transform lex to filters: single path', () => {
    const filters = FiltersUtil.newFilters();
    pill.lex2Filters(model1, filters);
    expect(filters).to.deep.equal(F_ONE);
  });

  it('transform lex to filters: multi paths', () => {
    const filters = FiltersUtil.newFilters();
    pill.lex2Filters(model1, filters);
    pill.lex2Filters(model2, filters);
    expect(filters).to.deep.equal(F_MULTI);
  });

  it('transform filters to lex: single path', () => {
    const lexQuery = [];
    pill.filters2Lex(F_ONE.clauses[0], pill.makeOption(), lexQuery);
    expect(lexQuery.length).to.equal(1);
  });

  it('transform filters to lex: multi paths', () => {
    const lexQuery = [];
    pill.filters2Lex(F_MULTI.clauses[0], pill.makeOption(), lexQuery);
    expect(lexQuery.length).to.equal(2);
  });
});
