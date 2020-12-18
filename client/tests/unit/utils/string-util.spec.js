import { expect } from 'chai';
import StringUtil from '@/utils/string-util';

describe('string-util', () => {
  it('clean text fragment - new lines', () => {
    const TEXT = 'a\\nbc\ndef';
    expect(StringUtil.cleanTextFragment(TEXT)).to.equal('a\\nbc def');
  });

  it('clean text fragment - weird commas', () => {
    const TEXT = 'a , bcd, e , f';
    expect(StringUtil.cleanTextFragment(TEXT)).to.equal('a, bcd, e, f');
  });
});



