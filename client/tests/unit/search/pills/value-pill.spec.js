import { expect } from 'chai';
import ValuePill from '@/search/pills/value-pill';
import FiltersUtil from '@/utils/filters-util';

const result = {
  clauses: [{ field: 'dummy', operand: 'or', isNot: false, values: ['abc', 'def'] }],
};

const model = {
  field: { key: 'dummy', meta: { searchKey: 'dummy' } },
  relation: { key: 'is' },
  value: [{ key: 'abc' }, { key: 'def' }],
};

describe('value-pill', () => {
  let pill = null;

  beforeEach(() => {
    pill = new ValuePill(
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

  it('transform lex to filters', () => {
    const filters = FiltersUtil.newFilters();
    pill.lex2Filters(model, filters);
    expect(filters).to.deep.equal(result);
  });

  it('transform filters to lex', () => {
    const lexQuery = [];
    pill.filters2Lex(result.clauses[0], pill.makeOption(), lexQuery);
    expect(lexQuery[0].value.length).to.equal(2);
    expect(lexQuery[0].value.map((v) => v.key)).to.deep.equal(['abc', 'def']);
  });
});
