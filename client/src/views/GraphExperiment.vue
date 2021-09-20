<template>
  <div>
    <div style="margin: 5px 0">
      <button
        class="btn btn-primary btn-xs"
        @click="loadDefault()">Config 1
      </button>
      &nbsp;
      <button
        class="btn btn-primary btn-xs"
        @click="loadConfig2()">Config 2
      </button>
      &nbsp;
      <button
        class="btn btn-primary btn-xs"
        @click="loadConfig3()">Config 3
      </button>
      &nbsp;
      <button
        class="btn btn-primary btn-xs"
        @click="toggleHelp()">Toggle Help
      </button>
    </div>
    <div
      ref="test"
      style="width:100%; height: 450px; border: 1px solid #888; background: #FCFCFC"
    />
  </div>
</template>


<script>
/* eslint-disable */
import _ from 'lodash';
// import API from '@/api/api';
import * as d3 from 'd3';
import { SVGRenderer, group, nodeSize, highlight, expandCollapse, panZoom } from 'svg-flowgraph';

import ELKAdapter from '@/graphs/elk/adapter';
import { layered } from '@/graphs/elk/layouts';
import svgUtil from '@/utils/svg-util';

window.d3 = d3;

const pathFn = svgUtil.pathFn.curve(d3.curveBasis);

class TestRenderer extends SVGRenderer {
  renderEdgeControl(selection) {
    selection.append('circle')
      .attr('r', 3.0)
      .style('stroke', '#888')
      .style('fill', '#D50')
      .style('cursor', 'pointer');
  }

  renderEdgeRemoved(edgeSelection) {
    edgeSelection.each(function() {
      d3.select(this).select('path').style('stroke', '#f80');
      d3.select(this)
        .transition()
        .on('end', function() {
          d3.select(this).remove();
        })
        .duration(1500)
        .style('opacity', 0.2);
    });
  }

  renderEdgeUpdated(edgeSelection) {
    edgeSelection
      .selectAll('.edge-path')
      .attr('d', d => {
        return pathFn(d.points);
      });
  }

  renderEdgeAdded(edgeSelection) {
    edgeSelection.append('path')
      .classed('edge-path', true)
      .attr('cursor', 'pointer')
      .attr('d', d => pathFn(d.points))
      .style('fill', 'none')
      .style('stroke', '#555')
      .style('stroke-opacity', 0.6)
      .style('stroke-width', 3)
      .style('cursor', 'pointer')
      .attr('marker-end', d => {
        const source = d.data.source.replace(/\s/g, '');
        const target = d.data.target.replace(/\s/g, '');
        return `url(#arrowhead-${source}-${target})`;
      })
      .attr('marker-start', d => {
        const source = d.data.source.replace(/\s/g, '');
        const target = d.data.target.replace(/\s/g, '');
        return `url(#start-${source}-${target})`;
      });
  }

  renderNodeRemoved(nodeSelection) {
    nodeSelection.each(function() {
      d3.select(this)
        .transition()
        .on('end', function() {
          d3.select(this.parentNode).remove();
        })
        .duration(1500)
        .style('opacity', 0.2)
        .select('rect').style('fill', '#f00');
    });
  }

  renderNodeUpdated(nodeSelection) {
    nodeSelection.each(function() {
      const selection = d3.select(this);
      selection.select('rect')
        .transition()
        .duration(1000)
        .attr('width', d => d.width)
        .attr('height', d => d.height);

      if (selection.datum().collapsed === true) {
        selection.append('text')
          .classed('collapsed', true)
          .attr('x', 13)
          .attr('y', 30)
          .style('font-size', 30)
          .text('+');
      } else {
        selection.select('.collapsed').remove();
      }
    });
  }

  renderNodeAdded(nodeSelection) {
    nodeSelection.each(function() {
      const selection = d3.select(this);
      selection.selectAll('*').remove();

      selection.append('rect')
        .attr('x', 0)
        .attr('rx', 5)
        .attr('y', 0)
        .attr('width', d => d.width)
        .attr('height', d => d.height)
        .style('fill-opacity', d => d.nodes? 0.15 : 0.5)
        .style('fill', d => {
          return d.nodes ? '#F80' : '#2EF';
        })
        .style('stroke', '#888')
        .style('stroke-opacity', 0.4)
        .style('stroke-width', 2);

      if (selection.datum().type === 'custom') {
        selection.select('rect').style('stroke-dasharray', 4).style('fill', '#CCF');
      }
    });

    nodeSelection.style('cursor', 'pointer');

    nodeSelection.append('text')
      .attr('x', d => d.nodes ? 0 : 0.5 * d.width)
      .attr('y', d => d.nodes ? -5 : 25)
      .style('fill', '#333')
      .style('font-weight', '400')
      .style('text-anchor', d => d.nodes ? 'left' : 'middle')
      .text(d => d.data.label);
  }

  renderEdge(edgeSelection) {
    edgeSelection.append('path')
      .classed('edge-path', true)
      .attr('cursor', 'pointer')
      .attr('d', d => pathFn(d.points))
      .style('fill', 'none')
      .style('stroke', '#02D')
      .style('stroke-width', 2)
      .attr('marker-end', d => {
        const source = d.data.source.replace(/\s/g, '');
        const target = d.data.target.replace(/\s/g, '');
        return `url(#arrowhead-${source}-${target})`;
      })
      .attr('marker-start', d => {
        const source = d.data.source.replace(/\s/g, '');
        const target = d.data.target.replace(/\s/g, '');
        return `url(#start-${source}-${target})`;
      });
  }
}


export default {
  name: 'GraphExperiment',
  created() {
    this.renderer = null;
  },
  mounted() {
    this.renderer = new TestRenderer({
      el: this.$refs.test,
      adapter: new ELKAdapter({ nodeWidth: 100, nodeHeight: 60, layout: layered }),
      renderMode: 'delta',
      addons: [expandCollapse, group, nodeSize, highlight, panZoom],
      useEdgeControl: false,
    });
    this.renderer.setCallback('nodeClick', (evt, node, renderer, event) => {
      console.log(event);
      if (!node.datum().collapsed || node.datum().collapsed === false) {
        this.renderer.collapse(node.datum().id);
      } else {
        this.renderer.expand(node.datum().id);
      }
    });
    this.renderer.setCallback('nodeDblClick', (evt, node) => {
      if (node.datum().focused === true) {
        this.renderer.resetNodeSize(node.datum().id);
      } else {
        this.renderer.setNodeSize(node.datum().id, 400, 400);
      }
    });
    this.renderer.setCallback('edgeClick', (evt, edge) => {
      console.log('edge click', edge.datum());
    });

    window.renderer = this.renderer;

    const nd = (s) => ({ id: s, label: s, concept: s });

    this.renderer.setData({
      id: 'root', concept: 'root',
      nodes: [
        { ...nd('L1.1'),
          nodes: [
            { ...nd('L2'),
              nodes: [
                nd('L3.1'),
                {
                  ...nd('L3.2'),
                  nodes: [
                    {
                      ...nd('L4.1'),
                      nodes: [
                        {
                          ...nd('L5.1')
                        }
                      ]
                    }
                  ]
                }
              ],
              edges: [
              ]
            }
          ],
          edges: [
          ]
        },
        nd('L1.2')
      ],
      edges: [
        { id: 'e1', source: 'L3.1', target: 'L3.2' },
        { id: 'e2', source: 'L1.2', target: 'L3.1' },
        { id: 'e3', source: 'L1.1', target: 'L3.2' },
        { id: 'e4', source: 'L4.1', target: 'L3.1' },
        { id: 'e5', source: 'L5.1', target: 'L3.1' },
        { id: 'e6', source: 'L1.1', target: 'L4.1' }
      ]
    });

    this.renderer.render();
  },
  methods: {
    moveTo(id) {
      this.renderer.moveTo(id, 1500);
    },
    toggleHelp() {
      this.renderer.options.useDebugger = !this.renderer.options.useDebugger;
      if (this.renderer.options.useDebugger === false) {
        d3.select(this.renderer.svgEl).select('.background-layer').selectAll('*').remove();
      }
      this.renderer.render();
    }
  }
};
</script>

<style lang="scss" scoped>
</style>
