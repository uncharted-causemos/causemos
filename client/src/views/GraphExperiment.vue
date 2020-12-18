<template>
  <div>
    <ul>
      <li> Click a node to highlight ancestor paths </li>
    </ul>
    <div>
      <button
        class="btn btn-primary btn-xs"
        @click="highlight()">Highlight
      </button>
      &nbsp;
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
        class="btn btn-warning btn-xs"
        @click="moveTo('a')">Center on "ES Mapping"
      </button>
      &nbsp;
      <button
        class="btn btn-warning btn-xs"
        @click="moveTo('j')">Center on "Bookmar, Experiment"
      </button>
    </div>

    <br>
    <div
      ref="test"
      style="width:800px; height: 400px; border: 1px solid #888"
    />
  </div>
</template>


<script>
import _ from 'lodash';
import * as d3 from 'd3';

import ELKBaseRenderer from '@/graphs/elk/elk-base-renderer';
import { layered } from '@/graphs/elk/elk-strategies';
import svgUtil from '@/utils/svg-util';
// import CX from '@/utils/cx.json';

// const CX_DATA = {
//   nodes: CX.nodes.map(n => {
//     return {
//       id: n.id
//     };
//   }),
//   edges: CX.edges.map(e => {
//     return {
//       source: e.source.id,
//       target: e.target.id
//     };
//   })
// };
//
// const CX_CONSTRAINTS = {
//   groups: CX.groups.map(g => {
//     return {
//       id: g.id,
//       members: g.members.map(m => m.id)
//     };
//   })
// };

class TestRenderer extends ELKBaseRenderer {
  renderNodes() {
    const chart = this.chart;
    chart.selectAll('.container').remove();
    chart.selectAll('.node').remove();

    const groups = chart.selectAll('.container')
      .data(this.layout.groups)
      .enter()
      .append('g')
      .classed('container', true)
      .attr('transform', d => {
        return svgUtil.translate(d.x, d.y);
      });

    groups.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', d => d.width)
      .attr('height', d => d.height)
      .style('stroke', '#000')
      .style('fill', 'transparent');

    // Build lookup
    const groupLookup = {};
    chart.selectAll('.container').each(function(d) {
      groupLookup[d.id] = d3.select(this);
    });

    const nodes = chart.selectAll('.node')
      .data(this.layout.nodes);

    nodes.enter().each(function(nodeData) {
      const group = _.isNil(nodeData.group) ? chart : groupLookup[nodeData.group];
      const node = group.append('g')
        .datum(nodeData)
        .classed('node', true)
        .attr('transform', d => {
          return svgUtil.translate(d.x, d.y);
        });

      node.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', d => d.width)
        .attr('height', d => d.height)
        .style('fill', '#EFF')
        .style('stroke', '#888')
        .style('stroke-width', 2);

      node.append('text')
        .attr('x', 10)
        .attr('y', 20)
        .style('fill', '#333')
        .style('font-weight', '600')
        .text(d => d.data.label);
    });
  }
}


// Default
const DATA = {
  nodes: [
    { id: 'a', concept: 'a', label: 'ES Mapping' },
    { id: 'b', concept: 'b', label: 'Clone/Copy Research' },
    { id: 'c', concept: 'c', label: 'Project Conn' },
    { id: 'd', concept: 'd', label: 'Document Conn' },
    { id: 'e', concept: 'e', label: 'Document Facet' },
    { id: 'f', concept: 'f', label: 'Statement Conn' },
    { id: 'g', concept: 'g', label: 'Statement Facet' },
    { id: 'h', concept: 'h', label: 'Adapter Interface' },
    { id: 'i', concept: 'i', label: 'Simple Connection' },
    { id: 'j', concept: 'j', label: 'Bookmark, Experiment...' },
    { id: 'k', concept: 'k', label: 'ES Queries Research' },
    { id: 'l', concept: 'l', label: 'Maps, Graphs' },
    { id: 'm', concept: 'm', label: 'Query generator' },
    { id: 'n', concept: 'n', label: 'Model, Experiment' }
  ],
  edges: [
    { source: 'b', target: 'c' },
    { source: 'h', target: 'i' },
    { source: 'h', target: 'c' },
    { source: 'h', target: 'd' },
    { source: 'd', target: 'e' },
    { source: 'h', target: 'f' },
    { source: 'f', target: 'g' },
    { source: 'i', target: 'j' },
    { source: 'c', target: 'd' },
    { source: 'c', target: 'f' },
    { source: 'c', target: 'l' },
    { source: 'c', target: 'n' },

    { source: 'a', target: 'm' },
    { source: 'm', target: 'l' },
    { source: 'm', target: 'd' },
    { source: 'm', target: 'f' },
    { source: 'k', target: 'm' }
  ]
};

const CONSTRAINTS = {
  groups: [
    {
      id: 'g1',
      members: ['d', 'e']
    },
    {
      id: 'g2',
      members: ['f', 'g']
    },
    {
      id: 'g3',
      members: ['i', 'j']
    }
  ]
};

const CONSTRAINTS2 = {
  groups: [
    {
      id: 'g1',
      members: ['d', 'e']
    },
    {
      id: 'g2',
      members: ['f', 'g', 'a']
    },
    {
      id: 'g3',
      members: ['i', 'j']
    }
  ]
};




export default {
  name: 'GraphExperiment',
  created() {
    this.renderer = null;
  },
  mounted() {
    this.renderer = new TestRenderer({
      el: this.$refs.test,
      strategy: layered,
      nodeWidth: 120,
      nodeHeight: 30,

      useEdgeControl: false,
      edgeControlOffsetType: 'unit',
      edgeControlOffset: -20
    });
    this.renderer.setData(DATA, CONSTRAINTS);
    this.renderer.render();
  },
  methods: {
    highlight() {
      const options = {
        duration: 4000,
        color: '#F40'
      };
      this.renderer.highlight({ nodes: ['b', 'c'], edges: [{ source: 'b', target: 'c' }] }, options);
    },
    loadDefault() {
      this.renderer.setData(DATA, CONSTRAINTS);
      this.renderer.render();
    },
    // loadCX() {
    //   this.renderer.setData(CX_DATA, CX_CONSTRAINTS);
    //   this.renderer.render();
    // },
    loadConfig2() {
      this.renderer.setData(DATA, CONSTRAINTS2);
      this.renderer.render();
    },
    moveTo(id) {
      this.renderer.moveTo(id, 1500);
    }
  }
};
</script>

<style lang="scss" scoped>
</style>
