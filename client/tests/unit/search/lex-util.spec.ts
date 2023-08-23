/* eslint-disable no-unused-expressions */

import LexUtil from '@/search/lex-util';

describe('lex-util', () => {
  it('convert to baseType', () => {
    const A = [{ key: '1' }, { key: '2' }, { key: '3' }];
    const expected = [1, 2, 3];
    expect(LexUtil.convertFromLex(A, 'integer')).to.deep.equal(expected);
  });
  it('convert to lexType', () => {
    const B = [1, 2, 3, 'b'];
    const expected = ['1', '2', '3', 'b'];
    expect(LexUtil.convertToLex(B, 'string')).to.deep.equal(expected);
  });
  it('doesnt convert on undefined type', () => {
    const B = [1, 2, 3, {}, 'xyz'];
    expect(LexUtil.convertToLex(B, 'undefined')).to.deep.equal(B);
  });
});
