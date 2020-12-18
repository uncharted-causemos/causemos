/* eslint-disable no-unused-expressions */
import { expect } from 'chai';
import ListFormatter from '@/filters/list-formatter';

describe('list-formatter', () => {
  it('formats empty array to n/a', () => {
    const array = [];
    expect(ListFormatter(array)).to.equal('n/a');
  });

  it('formats array with item', () => {
    const array = ['a', 'b', 'c'];
    expect(ListFormatter(array)).to.equal('a, b, c');
  });
});
