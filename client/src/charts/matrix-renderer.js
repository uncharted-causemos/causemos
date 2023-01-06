import svgUtil from '@/utils/svg-util';
import * as d3 from 'd3';

// Pick a readable foreground color based on background rgb values
const fontColor = (r, g, b) => {
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
  return luminance > 0.5 ? '#111' : '#eee';
};

// Currently accepts data in the CSR format, e.g. {
//  source: ['a', 'a'],
//  target: ['b', 'c'],
//  value: [0.9, 0.1]
// }
// which represents an edge a -> b with value 0.9, and an edge a -> c with value 0.1
export default function (
  svgElement,
  options,
  data,
  clampColourRange = false,
  log = false,
  selectedRowOrColumn = { isRow: false, concept: null },
  onRowOrColumnClicked = () => {}
) {
  const { axisLabelMargin, width, height, rowOrder, columnOrder, showRankLabels = false } = options;
  const margin = {
    top: axisLabelMargin,
    bottom: 0,
    left: axisLabelMargin,
    right: 0,
  };

  const cleanData = [];
  data.value.forEach((value, i) => {
    cleanData.push({
      row: data.rows[i],
      column: data.columns[i],
      value,
    });
  });

  const xScale = d3
    .scaleBand()
    .domain(columnOrder || data.columns)
    .range([margin.left, width - margin.right]);

  const yScale = d3
    .scaleBand()
    .domain(rowOrder || data.rows)
    .range([margin.top, height - margin.bottom]);

  const valueDomain = [d3.min(data.value), clampColourRange ? d3.max(data.value) : 1];
  let valueScale = log ? d3.scaleSequentialLog() : d3.scaleSequential();
  valueScale = valueScale.domain(valueDomain).interpolator(d3.interpolateGreys);

  const xAxis = svgElement
    .append('g')
    .attr('class', 'tour-x-axis-sensitivity-matrix')
    .attr('transform', svgUtil.translate(0, margin.top))
    .call(d3.axisTop(xScale));

  const isColumnSelected = (columnConcept) => {
    const { isRow, concept } = selectedRowOrColumn;
    return isRow === false && concept === columnConcept;
  };

  xAxis
    .selectAll('text')
    .attr('class', (dataPoint) => (isColumnSelected(dataPoint) ? 'selected' : ''))
    .on('click', (event, label) => onRowOrColumnClicked(false, label));

  // If there is more horizontal space than vertical space for each label
  if (xScale.bandwidth() < margin.top) {
    // Rotate so the labels are vertical and
    //  move them up so they are the same distance from the grid
    //  as the yAxis labels are
    const DIST_FROM_GRID = 9;
    xAxis
      .selectAll('text')
      .attr('transform', svgUtil.translate(DIST_FROM_GRID, -DIST_FROM_GRID) + ', rotate(-90)')
      .style('text-anchor', 'start');
  }

  xAxis.selectAll('.tick line').remove();
  xAxis.select('.domain').remove();

  const isRowSelected = (rowConcept) => {
    const { isRow, concept } = selectedRowOrColumn;
    return isRow === true && concept === rowConcept;
  };

  const yAxis = svgElement
    .append('g')
    .attr('transform', svgUtil.translate(margin.left, 0))
    .call(d3.axisLeft(yScale));

  yAxis
    .selectAll('text')
    .attr('class', (dataPoint) => (isRowSelected(dataPoint) ? 'selected' : ''))
    .on('click', (event, label) => onRowOrColumnClicked(true, label));

  yAxis.selectAll('.tick line').remove();
  yAxis.select('.domain').remove();

  // Draw rectangles
  const rectGroups = svgElement
    .selectAll('g.rects')
    .data(cleanData)
    .join('g')
    .attr('class', 'rects')
    .attr('transform', (d) => svgUtil.translate(xScale(d.column), yScale(d.row)));

  rectGroups
    .append('rect')
    .attr('width', xScale.bandwidth)
    .attr('height', yScale.bandwidth)
    .attr('fill', (d) => valueScale(d.value));

  if (showRankLabels && yScale.bandwidth() > 5) {
    const rankedValues = cleanData.map((d) => d.value).sort(d3.descending);
    const getRanking = (value) => {
      const index = rankedValues.findIndex((rankedValue) => rankedValue === value);
      return index;
    };

    const fontSize = Math.min(18, yScale.bandwidth() * 0.85);

    rectGroups
      .append('text')
      .attr('transform', svgUtil.translate(xScale.bandwidth() / 2, yScale.bandwidth() / 2))
      .attr('text-anchor', 'middle')
      .attr('font-size', `${fontSize}px`)
      .attr('stroke-linejoin', 'round')
      .attr('stroke', 'none')
      .attr('fill', (d) => {
        const bcolor = d3.rgb(valueScale(d.value));
        return fontColor(bcolor.r, bcolor.g, bcolor.b);
      })
      .attr('dominant-baseline', 'middle')
      .text((d) => getRanking(d.value) + 1); // Display 1-indexed
  }

  // Create x grid lines by making a new axis and extending the ticks to the
  // height of the grid
  svgElement
    .append('g')
    .attr('class', 'grid-lines tour-grid-lines')
    .attr('transform', svgUtil.translate(xScale.bandwidth() / 2, height - margin.bottom))
    .call(
      d3
        .axisTop(xScale)
        .tickSize(height - margin.top - margin.bottom)
        .tickFormat('') // remove labels
    )
    .selectAll('.tick:last-of-type')
    .remove();

  // y grid lines
  svgElement
    .append('g')
    .attr('class', 'grid-lines tour-grid-lines')
    .attr('transform', svgUtil.translate(width - margin.right, yScale.bandwidth() / 2))
    .call(
      d3
        .axisLeft(yScale)
        .tickSize(width - margin.right - margin.left)
        .tickFormat('') // remove labels
    )
    .selectAll('.tick:last-of-type')
    .remove();
}
