import RangePill from '@/search/pills/range-pill';
import FiltersUtil from '@/utils/filters-util';

const result = {
  clauses: [{ field: 'dummy', operand: 'or', isNot: false, values: [[5, 10]] }],
};

const model = {
  field: { key: 'dummy', meta: { searchKey: 'dummy' } },
  relation: { key: 'is' },
  value: { key: 5 },
  secondaryValue: { key: 10 },
};

describe('range-pill', () => {
  let pill = null;

  beforeEach(() => {
    pill = new RangePill({
      field: 'dummy',
      display: 'dummy',
      searchDisplay: 'dummy',
      searchable: true,
      ranged: true,
    });
  });

  it('transform lex to filters', () => {
    const filters = FiltersUtil.newFilters();
    pill.lex2Filters(model, filters);
    expect(filters).to.deep.equal(result);
  });

  it('transform filters to lex', () => {
    const lexQuery = [];
    pill.filters2Lex(result.clauses[0], pill.makeOption(), lexQuery);
    expect(lexQuery[0].value.key).to.equal(5);
    expect(lexQuery[0].secondaryValue.key).to.equal(10);
  });
});
