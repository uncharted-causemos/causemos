<template>
  <div>
    <div
      id="test"
      style="width:100%; height: 450px; border: 1px solid #888; background: #FCFCFC"
    />
  </div>
</template>


<script lang="ts">
/* eslint-disable */
import * as d3 from 'd3';
import _ from 'lodash';
import { AbstractCAGRenderer, D3SelectionINode, D3SelectionIEdge } from '@/graphs/abstract-cag-renderer';
import { buildInitialGraph, runELKLayout } from '@/graphs/cag-adapter';
import svgUtil from '@/utils/svg-util';
import { IGraph, group } from 'svg-flowgraph';
import { defineComponent } from 'vue';
window.d3 = d3;

const pathFn = svgUtil.pathFn.curve(d3.curveBasis);

class TestRenderer extends AbstractCAGRenderer<any, any> {
  constructor(options: any) {
    super(options);
  }

  renderNodesAdded(selection: D3SelectionINode<any>) {
    selection
      .append('rect')
      .classed('node-container-outer', true)
      .attr('x', -3)
      .attr('y', -3)
      .attr('rx', 2)
      .attr('width', d => d.width)
      .attr('height', d => d.height)
      .style('stroke', '#222')
      .style('stroke-dasharray', (d: any) => d.nodes.length > 0 ? '4' : null)
      .style('stroke-width', 2)
      .style('cursor', 'pointer')
      .style('fill', (d: any) => d.nodes.length > 0 ? 'none' : '#EEE');

    selection.append('text')
      .attr('x', (d: any) => d.nodes.length > 0 ? 250 : 5)
      .attr('y', (d: any) => d.nodes .length > 0 ? -8 : 15)
      .style('font-size', 16)
      .text(d => d.label);
  }

  renderEdgesAdded(selection: D3SelectionIEdge<any>) {
    selection
      .append('path')
      .classed('edge-path-bg-outline', true)
      .style('fill', 'none')
      .style('stroke', '#888')
      .style('stroke-width', 4)
      .attr('d', d => pathFn(d.points as any));

  }

  renderNodesUpdated(_selection: D3SelectionINode<any>) {}
  renderNodesRemoved(_selection: D3SelectionINode<any>) {}
  renderEdgesUpdated(_selection: D3SelectionIEdge<any>) {}
  renderEdgesRemoved(_selection: D3SelectionIEdge<any>) {}
}


const G = {
  nodes: [
    {
      id: 'rainfall',
      concept: 'rainfall'
    },
    {
      id: 'fertilizer',
      concept: 'fertilizer'
    },
    {
      id: 'crop',
      concept: 'crop'
    },
    {
      id: 'famine',
      concept: 'famine'
    },
    {
      id: 'subsidies',
      concept: 'subsidies'
    }
  ],
  edges: [
    {
      id: 1,
      source: 'rainfall',
      target: 'crop'
    },
    {
      id: 2,
      source: 'fertilizer',
      target: 'crop'
    },
    {
      id: 3,
      source: 'crop',
      target: 'famine'
    },
    {
      id: 4,
      source: 'subsidies',
      target: 'fertilizer'
    }
  ]
};

let renderer:any = null;

export default defineComponent({
  name: 'GraphExperiment',
  mounted() {
    const testEl = document.getElementById('test');
    renderer = new TestRenderer({
      el: testEl,
      useAStarRouting: true,
      useStableLayout: true,
      useStableZoomPan: true,
      runLayout: (graphData: IGraph<any, any>) => {
        return runELKLayout(graphData, { width: 160, height: 50 });
      }
    });
    this.refresh();
  },
  methods: {
    async refresh() {
      if (renderer) {
        const d = buildInitialGraph(G as any);
        console.log(G, d);
        await renderer.setData(d);

        group(renderer, 'nodes I care about', ['famine', 'crop']);
        await renderer.render();

        renderer.bubbleSet({ bubbleNodes: [
          { concept: 'fertilizer' },
          { concept: 'rainfall' },
          { concept: 'crop' }
        ]}, '#309');

        renderer.bubbleSet({ bubbleNodes: [
          { concept: 'subsidies' },
          { concept: 'fertilizer' }
        ]}, '#1E2');

      }
    }
  }
});
</script>

<style lang="scss" scoped>
</style>
