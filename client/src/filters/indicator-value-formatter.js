import * as d3 from 'd3';

const locale = d3.formatLocale({
  minus: '-'
});

// use d3 format as it has better support of abbreviations for large and small values
export default function (value) {
  return locale.format('.3s')(value);
}
