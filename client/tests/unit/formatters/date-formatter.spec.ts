import DateFormatter from '@/formatters/date-formatter';

const dateMillis = Date.UTC(2019, 7, 20);
const formatted = '2019-08-20 00:00:00';

describe('date-formatter', () => {
  it('default format YYYY-MM-DD HH:mm:ss epoch millis', () => {
    expect(DateFormatter(dateMillis)).to.equal(formatted);
  });

  it('default format YYYY-MM-DD HH:mm:ss - date object', () => {
    expect(DateFormatter(new Date(dateMillis))).to.equal(formatted);
  });

  it('custom date format', () => {
    expect(DateFormatter(dateMillis, 'MM+YYYY')).to.equal('08+2019');
  });
});
