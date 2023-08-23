import StringUtil, { convertStringToBoolean } from '@/utils/string-util';

describe('string-util', () => {
  it('clean text fragment - new lines', () => {
    const TEXT = 'a\\nbc\ndef';
    expect(StringUtil.cleanTextFragment(TEXT)).to.equal('a\\nbc def');
  });

  it('clean text fragment - weird commas', () => {
    const TEXT = 'a , bcd, e , f';
    expect(StringUtil.cleanTextFragment(TEXT)).to.equal('a, bcd, e, f');
  });

  it('should return scientific notation for numbers over 1000 when the range top number 1,000,000 or greater', () => {
    const mil = 1000000;
    const formatter = StringUtil.chartValueFormatter(0, mil);
    expect(formatter(mil)).to.equal('1.00e+6');
    expect(formatter(10000)).to.equal('1.00e+4');
    expect(formatter(100)).to.equal('100');
  });

  it('should return scientific notation for numbers under 0.00001 when the range buttom number is 0.00001 or less', () => {
    const ht = 0.00001;
    const formatter = StringUtil.chartValueFormatter(ht, 100);
    expect(formatter(ht)).to.equal('1.00e-5');
    expect(formatter(0.0001)).to.equal('0.0001');
    expect(formatter(0.001)).to.equal('0.001');
    expect(formatter(0.00123)).to.equal('0.0012');
  });

  describe('convertStringToBoolean', () => {
    it('parses true and false as booleans regardless of capitalization', () => {
      expect(convertStringToBoolean('true')).to.equal(true);
      expect(convertStringToBoolean('True')).to.equal(true);
      expect(convertStringToBoolean('TRUE')).to.equal(true);
      expect(convertStringToBoolean('false')).to.equal(false);
      expect(convertStringToBoolean('False')).to.equal(false);
      expect(convertStringToBoolean('FALSE')).to.equal(false);
    });

    it('throws an error for any other string or invalid value', () => {
      const invalidStrings = ['', 'truefalse', 'true ', ' false', undefined, null];
      invalidStrings.forEach((invalidString) => {
        expect(convertStringToBoolean.bind(this, invalidString as string)).to.throw(
          `Unable to convert string "${invalidString}" to boolean.`
        );
      });
    });
  });
});
