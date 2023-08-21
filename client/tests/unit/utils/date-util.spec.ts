import { snapTimestampToNearestMonth } from '@/utils/date-util';

describe('date-util', () => {
  describe('snapTimestampToNearestMonth', () => {
    it('should snap May 10th to May', () => {
      const may10Timestamp = new Date(Date.UTC(2020, 4, 10)).getTime();
      const mayTimestamp = new Date(Date.UTC(2020, 4)).getTime();
      const result = snapTimestampToNearestMonth(may10Timestamp);
      expect(result).to.equal(mayTimestamp);
    });
    it('should snap May 20th to June', () => {
      const may20Timestamp = new Date(Date.UTC(2020, 4, 20)).getTime();
      const juneTimestamp = new Date(Date.UTC(2020, 5)).getTime();
      const result = snapTimestampToNearestMonth(may20Timestamp);
      expect(result).to.equal(juneTimestamp);
    });
    it('should snap January 10th to January', () => {
      const jan10Timestamp = new Date(Date.UTC(2020, 0, 10)).getTime();
      const janTimestamp = new Date(Date.UTC(2020, 0)).getTime();
      const result = snapTimestampToNearestMonth(jan10Timestamp);
      expect(result).to.equal(janTimestamp);
    });
    it('should snap December 20th to January of the following year', () => {
      const dec20Timestamp = new Date(Date.UTC(2020, 11, 20)).getTime();
      const nextJanTimestamp = new Date(Date.UTC(2021, 0)).getTime();
      const result = snapTimestampToNearestMonth(dec20Timestamp);
      expect(result).to.equal(nextJanTimestamp);
    });
  });
});
