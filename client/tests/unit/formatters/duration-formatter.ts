import DurationFormatter from '@/formatters/duration-formatter';

describe('duration-formatter', () => {
  it('humanized durations', () => {
    const minute = 60 * 1000;
    const hour = minute * 60;
    const day = hour * 24;

    expect(DurationFormatter(5 * hour)).to.equal('5 hours');
    expect(DurationFormatter(32 * day)).to.equal('a month');
    expect(DurationFormatter(50 * day)).to.equal('2 months');
  });

  it('null input', () => {
    expect(DurationFormatter(null)).to.equal('');
  });
});
