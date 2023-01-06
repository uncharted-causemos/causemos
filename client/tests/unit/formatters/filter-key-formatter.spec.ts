import { expect } from 'chai';
import FilterKeyFormatter from '@/formatters/filter-key-formatter';
import CodeUtil from '@/utils/code-util';

describe('filter-key-formatter', () => {
  const entries = Object.values(CodeUtil.CODE_TABLE);

  it('format known keys', () => {
    entries.forEach((entry) => {
      expect(FilterKeyFormatter(entry.field)).to.equal(entry.display);
    });
  });

  it('formats unknown keys', () => {
    const unknownKey = 'this_is_not_a_key';
    expect(FilterKeyFormatter(unknownKey)).to.equal(unknownKey);
  });
});
