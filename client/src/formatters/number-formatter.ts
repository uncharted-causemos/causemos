import * as d3 from 'd3';
import _ from 'lodash';

const defaultFormatter = d3.format(',');

export default function (value: number) {
  return _.isFinite(value) ? defaultFormatter(value) : 0;
}
