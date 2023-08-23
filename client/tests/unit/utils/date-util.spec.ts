import { TemporalResolutionOption } from '@/types/Enums';
import {
  snapTimestampToNearestMonth,
  calculateNextTimestamp,
  getFormattedTimeInterval,
} from '@/utils/date-util';

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
  describe('calculateNextTimestamp', () => {
    it('should return next monthly timestamp', () => {
      const dateA = 1546300800000; // 2019-1-1
      const dateB = 1556668800000; // 2019-5-1
      const result = calculateNextTimestamp(dateA, 4, TemporalResolutionOption.Month);
      expect(result).to.equal(dateB);
    });
    it('should return next yearly timestamp', () => {
      const dateA = 1546300800000; // 2019-1-1
      const dateB = 1609459200000; // 2021-1-1
      const result = calculateNextTimestamp(dateA, 2, TemporalResolutionOption.Year);
      expect(result).to.equal(dateB);
    });
  });
  describe('getFormattedTimeInterval', () => {
    it('returns correct label for a monthly interval', () => {
      const result = getFormattedTimeInterval(1, TemporalResolutionOption.Month);
      expect(result).to.equal('monthly');
    });

    it('returns correct label for a quarterly interval', () => {
      const result = getFormattedTimeInterval(3, TemporalResolutionOption.Month);
      expect(result).to.equal('quarterly');
    });

    it('returns correct label for an annual interval', () => {
      const result = getFormattedTimeInterval(12, TemporalResolutionOption.Month);
      expect(result).to.equal('annual');
    });

    it('returns correct label for a biennial interval', () => {
      const result = getFormattedTimeInterval(2, TemporalResolutionOption.Year);
      expect(result).to.equal('biennial');
    });

    it('returns correct label for custom interval', () => {
      const result = getFormattedTimeInterval(6, TemporalResolutionOption.Year);
      expect(result).to.equal('6 years');
    });

    it('returns correct label for custom monthly interval', () => {
      const result = getFormattedTimeInterval(4, TemporalResolutionOption.Month);
      expect(result).to.equal('4 months');
    });

    it('returns empty string for unsupported resolution', () => {
      const result = getFormattedTimeInterval(
        1,
        'UnsupportedResolution' as TemporalResolutionOption
      );
      expect(result).to.equal('');
    });
  });
});
