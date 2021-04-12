/**
 * Facet utility functions for uncharted/stories-facets
 */

/*
 * Static temporal month label list
 */
const MONTH_RANGE_LIST = [
  ['Jan', 'Jan'],
  ['Feb', 'Feb'],
  ['Mar', 'Mar'],
  ['Apr', 'Apr'],
  ['May', 'May'],
  ['Jun', 'Jun'],
  ['Jul', 'Jul'],
  ['Aug', 'Aug'],
  ['Sep', 'Sep'],
  ['Oct', 'Oct'],
  ['Nov', 'Nov'],
  ['Dec', 'Dec']
];

const monthLabelFormatter = (value: string | number) => {
  const monthRange = MONTH_RANGE_LIST[+value - 1];
  return monthRange[0];
};
const numEvidencesLabelFormatter = (value: string | number) => {
  const formattedValue = value === '--' ? '5+' : value;
  return formattedValue;
};

export default {
  numEvidencesLabelFormatter,
  monthLabelFormatter
};
