/* eslint-disable no-unused-expressions */

import PrecisionFormatter from '@/formatters/precision-formatter';

describe('precision-formatter', () => {
  const SCORE = 0.123456;

  it('formatting default', () => {
    expect(PrecisionFormatter(SCORE)).to.equal('0.12');
  });

  it('formatting 4 decimal', () => {
    expect(PrecisionFormatter(SCORE, 4)).to.equal('0.1235');
  });

  it('formatting 10 decimal', () => {
    expect(PrecisionFormatter(SCORE, 10)).to.equal('0.1234560000');
  });
});
