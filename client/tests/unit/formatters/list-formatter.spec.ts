/* eslint-disable no-unused-expressions */
import ListFormatter from '@/formatters/list-formatter';

describe('list-formatter', () => {
  it('formats empty array to n/a', () => {
    const array: string[] = [];
    expect(ListFormatter(array)).to.equal('n/a');
  });

  it('formats array with item', () => {
    const array: string[] = ['a', 'b', 'c'];
    expect(ListFormatter(array)).to.equal('a, b, c');
  });
});
