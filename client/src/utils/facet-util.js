import _ from 'lodash';

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

const reshuffle = (facetData, selectedValues) => {
  // First global sort on selected count
  const ordered = _.orderBy(facetData, term => {
    return term.selected ? -term.selected : 0;
  });


  const selectedTerms = _.remove(ordered, term => {
    return selectedValues.indexOf(term.value) >= 0;
  });

  // Shift-in the selected terms. Backwards so they are still in sorted order.
  if (!_.isEmpty(selectedTerms)) {
    selectedTerms.reverse().forEach(term => {
      ordered.splice(0, 0, term);
    });
  }
  return ordered;
};


const createFacetCountSelection = (facet, facetData) => {
  const selection = facetData.map(term => {
    return {
      value: term.value,
      selected: {
        count: term.selected,
        countLabel: term.countLabel
      }
    };
  });

  return {
    key: facet,
    facets: selection
  };
};


// User selections
const createHistogramSelection = (facet, from, to) => {
  return [{
    key: facet,
    facets: [{
      value: facet,
      selection: {
        range: { from, to }
      }
    }]
  }];
};


// Partial selections
const createHistogramSlices = (facet, slices) => {
  return [{
    key: facet,
    facets: [{
      value: facet,
      selection: {
        slices: slices
      }
    }]
  }];
};

const monthLabelFormatter = (value) => {
  const monthRange = MONTH_RANGE_LIST[+value - 1];
  return monthRange[0];
};
const numEvidencesLabelFormatter = (value) => {
  const formattedValue = value === '--' ? '5+' : value;
  return formattedValue;
};

export default {
  createHistogramSelection,
  createHistogramSlices,
  createFacetCountSelection,
  reshuffle,
  numEvidencesLabelFormatter,
  monthLabelFormatter
};
