/* eslint-disable no-unused-expressions */

import NumberFormatter from '@/formatters/number-formatter';

describe('number-formatter', () => {
  const NUMBER = 12345.6789;

  it('default formatting', () => {
    expect(NumberFormatter(NUMBER)).to.equal('12,345.6789');
  });
});
