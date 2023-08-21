/* eslint-disable no-unused-expressions */

import TimestampFormatter from '@/formatters/timestamp-formatter';
import { TemporalAggregationLevel, TemporalResolutionOption } from '@/types/Enums';

describe('timestamp-formatter', () => {
  const date = 0;

  it('default formatting', () => {
    expect(TimestampFormatter(date, null, null)).to.equal('January 1970');
  });

  it('TemporalAggregationLevel.Year formatting', () => {
    expect(TimestampFormatter(date, TemporalAggregationLevel.Year, null)).to.equal('January');
  });

  it('TemporalResolutionOption.Year formatting', () => {
    expect(TimestampFormatter(date, null, TemporalResolutionOption.Year)).to.equal('1970');
  });
});
