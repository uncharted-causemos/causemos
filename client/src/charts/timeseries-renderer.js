import * as d3 from 'd3';
import initialize from '@/charts/initialize';

export default function(selection, data, renderOptions, runOptions) {
  const chart = initialize(selection, renderOptions);
  render(chart, data, runOptions);
}

//   return d3.line()
//     .x(d => xscale(d.timestamp))
//     .y(d => yscale(d.value))
//     .curve(d3.curveMonotoneX);


function render(chart, data, runOptions) {
  // Chart params
  const height = chart.y2 - chart.y1;
  const width = chart.x2 - chart.x1;

  const xExtent = d3.extent(data.map(s => s.data.map(v => v.timestamp)).flat());
  const yExtent = d3.extent(data.map(s => s.data.map(v => v.value)).flat());

  console.log(xExtent, yExtent);

  const svgGroup = chart.g;
  const xscale = d3.scaleLinear().domain(xExtent).range([0, width]);
  const yscale = d3.scaleLinear().domain(yExtent).range([height, 0]).clamp(true);

  if (runOptions.mode === 'line') {
    renderLine(svgGroup, data, xscale, yscale);
  } else {
    renderDots(svgGroup, data, xscale, yscale);
  }
}

function renderDots(svgGroup, data, xscale, yscale) {
  for (let i = 0; i < data.length; i++) {
    const series = data[i];
    const seriesGroup = svgGroup.append('g');
    seriesGroup.selectAll('circle')
      .data(series.data)
      .enter()
      .append('circle')
      .attr('cx', d => xscale(d.timestamp))
      .attr('cy', d => yscale(d.value))
      .attr('r', 4)
      .style('fill', 'none')
      .style('stroke', '#000');
  }
}


// line
function renderLine(svgGroup, data, xscale, yscale) {
  const line = d3.line()
    .x(d => xscale(d.timestamp))
    .y(d => yscale(d.value));

  for (let i = 0; i < data.length; i++) {
    const series = data[i];
    const seriesGroup = svgGroup.append('g');
    seriesGroup.append('path')
      .attr('d', line(series.data))
      .style('fill', 'none')
      .style('stroke', '#000');
  }
}

