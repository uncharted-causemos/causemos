import EdgePill from '@/search/pills/edge-pill';
import FiltersUtil from '@/utils/filters-util';

// example filter objects
const ONE_EDGE = {
  clauses: [
    {
      field: 'dummy',
      operand: 'or',
      isNot: false,
      values: ['abc///def'],
    },
  ],
};

const MULTI_EDGES = {
  clauses: [
    {
      field: 'dummy',
      operand: 'or',
      isNot: false,
      values: ['abc///def', 'xyz///efg'],
    },
  ],
};

// example lex query objects
const LEX_EDGE_ONE = {
  field: { key: 'dummy', meta: { searchKey: 'dummy' } },
  relation: { key: 'from' },
  value: { key: 'abc' },
  secondaryValue: { key: 'def' },
};

const LEX_EDGE_TWO = {
  field: { key: 'dummy', meta: { searchKey: 'dummy' } },
  relation: { key: 'from' },
  value: { key: 'xyz' },
  secondaryValue: { key: 'efg' },
};

describe('edge-pill', () => {
  let pill = null;

  beforeEach(() => {
    pill = new EdgePill(
      {
        field: 'dummy',
        display: 'dummy',
        searchDisplay: 'dummy',
        searchable: true,
        ranged: false,
      },
      [],
      'test'
    );
  });

  it('transform lex to filters: single edge', () => {
    const filters = FiltersUtil.newFilters();
    pill.lex2Filters(LEX_EDGE_ONE, filters);
    expect(filters).to.deep.equal(ONE_EDGE);
  });

  it('transform lex to filters: multi edges', () => {
    const filters = FiltersUtil.newFilters();
    pill.lex2Filters(LEX_EDGE_ONE, filters);
    pill.lex2Filters(LEX_EDGE_TWO, filters);
    expect(filters).to.deep.equal(MULTI_EDGES);
  });

  it('transform filters to lex: single edge', () => {
    const lexQuery = [];
    pill.filters2Lex(ONE_EDGE.clauses[0], pill.makeOption(), lexQuery);
    expect(lexQuery.length).to.equal(1);
  });

  it('transform filters to lex: multi edges', () => {
    const lexQuery = [];
    pill.filters2Lex(MULTI_EDGES.clauses[0], pill.makeOption(), lexQuery);
    expect(lexQuery.length).to.equal(2);
  });
});
