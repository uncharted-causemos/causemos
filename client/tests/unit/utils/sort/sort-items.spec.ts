import { sortItem } from '@/utils/sort/sort-items';

describe('sort-items by Most Recent', () => {
  it('sorts items by date', () => {
    const collection = [
      { name: 'a', date: '2020-01-01' },
      { name: 'b', date: '2020-01-02' },
      { name: 'c', date: '2020-01-03' },
    ];
    const sortBy = { date: 'date', name: 'name' };
    const sortOption = 'Most recent';
    const result = sortItem(collection, sortBy, sortOption);
    expect(result).to.deep.equal([
      { name: 'c', date: '2020-01-03' },
      { name: 'b', date: '2020-01-02' },
      { name: 'a', date: '2020-01-01' },
    ]);
  });
});

describe('sort-items by Oldest', () => {
  it('sorts items by date', () => {
    const collection = [
      { name: 'a', date: '2020-01-01' },
      { name: 'b', date: '2020-01-02' },
      { name: 'c', date: '2020-01-03' },
    ];
    const sortBy = { date: 'date', name: 'name' };
    const sortOption = 'Oldest';
    const result = sortItem(collection, sortBy, sortOption);
    expect(result).to.deep.equal([
      { name: 'a', date: '2020-01-01' },
      { name: 'b', date: '2020-01-02' },
      { name: 'c', date: '2020-01-03' },
    ]);
  });
});

describe('sort-items by A-Z', () => {
  it('sorts items by name', () => {
    const collection = [
      { name: 'a', date: '2020-01-01' },
      { name: 'b', date: '2020-01-02' },
      { name: 'c', date: '2020-01-03' },
    ];
    const sortBy = { date: 'date', name: 'name' };
    const sortOption = 'A-Z';
    const result = sortItem(collection, sortBy, sortOption);
    expect(result).to.deep.equal([
      { name: 'a', date: '2020-01-01' },
      { name: 'b', date: '2020-01-02' },
      { name: 'c', date: '2020-01-03' },
    ]);
  });
});

describe('sort-items by Z-A', () => {
  it('sorts items by name', () => {
    const collection = [
      { name: 'a', date: '2020-01-01' },
      { name: 'b', date: '2020-01-02' },
      { name: 'c', date: '2020-01-03' },
    ];
    const sortBy = { date: 'date', name: 'name' };
    const sortOption = 'Z-A';
    const result = sortItem(collection, sortBy, sortOption);
    expect(result).to.deep.equal([
      { name: 'c', date: '2020-01-03' },
      { name: 'b', date: '2020-01-02' },
      { name: 'a', date: '2020-01-01' },
    ]);
  });
});
