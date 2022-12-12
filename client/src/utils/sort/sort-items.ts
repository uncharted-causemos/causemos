import _ from 'lodash';

export function sortItem(collection: any, sortBy: { date: Function; name: Function | string; }, sortOption: string) {
  switch (sortOption) {
    case 'Most recent':
      return _.orderBy(collection, [sortBy.date], ['desc']);
    case 'Oldest':
      return _.orderBy(collection, [sortBy.date], ['asc']);
    case 'A-Z':
      return _.orderBy(collection, [sortBy.name], ['asc']);
    case 'Z-A':
      return _.orderBy(collection, [sortBy.name], ['desc']);
    default:
      return collection;
  }
}

export const nameSorter = (listItem: { name: string; }) => listItem.name.trim().toLowerCase();

export const modifiedAtSorter = (listItem: { modified_at: string; }) => listItem.modified_at;

export const createdAtSorter = (listItem: { created_at: string; }) => listItem.created_at;

export const titleSorter = (listItem: { title: string; }) => listItem.title.trim().toLowerCase();

export enum SortOptions {
    MostRecent = 'Most recent',
    Oldest = 'Oldest',
    AtoZ = 'A-Z',
    ZtoA = 'Z-A',
}
