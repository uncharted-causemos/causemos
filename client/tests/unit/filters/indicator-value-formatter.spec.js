/* eslint-disable no-unused-expressions */
import { expect } from 'chai';
import IndicatorValueFormatter from '@/filters/indicator-value-formatter';

describe('indicator-value-formatter', () => {
  it('negative value formatting', () => {
    expect(IndicatorValueFormatter(-1234)).to.equal('-1.23k');
  });
  it('small SI formatting', () => {
    expect(IndicatorValueFormatter(10 ** -9)).to.equal('1.00n');
  });
  it('large SI formatting', () => {
    expect(IndicatorValueFormatter(1000 ** 3)).to.equal('1.00G');
  });
  it('proper display of significant values with rounding', () => {
    expect(IndicatorValueFormatter(999)).to.equal('999');
    expect(IndicatorValueFormatter(123.5)).to.equal('124');
  });
});
