import { expect } from 'chai';
import FilterValueFormatter from '@/filters/filter-value-formatter';
import CodeUtil from '@/utils/code-util';

const FIELDS = CodeUtil.FIELDS;

describe('filter-value-formatter', () => {
  it('format simple type values', () => {
    expect(FilterValueFormatter('abc', FIELDS.TOPIC)).to.equal('abc');
    expect(FilterValueFormatter(-1, FIELDS.POLARITY)).to.equal('Negative');
  });

  it('format object/arrays', () => {
    expect(FilterValueFormatter([0.2, 0.7], FIELDS.SCORE)).to.equal('0.2 to 0.7');
  });
});
