<template>
  <div
    ref="container"
    class="labels-list-container"
  />
</template>

<script>
import _ from 'lodash';
import * as d3 from 'd3';
import { mapActions } from 'vuex';
import { SELECTED_COLOR_DARK } from '@/utils/colors-util';
import svgUtil from '@/utils/svg-util';
import stringUtil from '@/utils/string-util';

export default {
  name: 'LabelsList',
  props: {
    data: {
      type: Object,
      default: () => ({}) // model and order
    },
    highlights: {
      type: Object,
      default: () => ({})
    },
    hovered: {
      type: String,
      default: ''
    },
    config: {
      type: Object,
      default: () => ({})
    }
  },
  data: () => ({
    chart: null
  }),
  watch: {
    data(n, o) {
      if (_.isEqual(n, o)) return;
      this.clearCanvas();
      this.refresh();
    },
    highlights() {
      this.clearHighlights();
      this.highlightList();
    },
    hovered() {
      this.clearHighlights();
      this.highlightList();
      this.highlightHovered();
    }
  },
  mounted() {
    this.refresh();
  },
  methods: {
    ...mapActions({
      setCurrentTab: 'panel/setCurrentTab',
      setSelectedNode: 'graph/setSelectedNode'
    }),
    clearCanvas() {
      d3.select(this.$refs.container).selectAll('*').remove();
    },
    refresh() {
      if (_.isEmpty(this.data)) return;
      this.render();
    },
    render() {
      this.clearCanvas();

      const margin = this.config.margin;
      const list = this.data.order;
      const height = (this.config.itemHeight * list.length) + (margin.top + margin.bottom);
      const width = 150;

      this.chart = d3.select(this.$refs.container)
        .append('svg')
        .attr('width', width + 'px')
        .attr('height', height + 'px')
        .on('click', this.clearList)
        .attr('preserveAspectRatio', 'xMinYMin meet')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .append('g')
        .attr('transform', svgUtil.translate(margin.left, margin.top));


      // Keep to a constant height if possible
      const groupHeight = this.config.itemHeight;
      const y = d3.scalePoint()
        .range([5, groupHeight * (list.length - 1)])
        .domain(list);

      const label = this.chart
        .selectAll('.label-item')
        .data(list)
        .enter()
        .append('text')
        .attr('class', 'label-item')
        .attr('x', 0)
        .attr('y', (d) => y(d))
        .text(d => {
          let concept = _.last(d.split('/'));
          concept = concept.replace(/_/g, ' ');
          return stringUtil.truncateString(concept, 15);
        })
        .attr('cursor', 'pointer')
        .style('text-anchor', 'right')
        .style('alignment-baseline', 'right')
        .style('font-size', '12px')
        .on('click', this.selectNode)
        .on('mouseover', this.hoverNode)
        .on('mouseout', this.clearHover);

      label.append('title')
        .text(d => d);
    },
    clearHighlights() {
      this.chart.selectAll('.label-item')
        .style('font-weight', 'normal')
        .style('font-size', '12px')
        .style('opacity', 1.0)
        .style('fill', '#000');
    },
    highlightList() {
      if (_.isEmpty(this.highlights)) return;

      this.chart.selectAll('.label-item').filter(label => {
        const match = this.checkPresentLabel(this.highlights.nodes, label);
        return _.isEmpty(match);
      }).style('opacity', 0.1);

      this.chart.selectAll('.label-item').filter(label => label === this.highlights.selectedNode)
        .style('fill', SELECTED_COLOR_DARK)
        .style('font-weight', 'bold')
        .style('font-size', '14px');
    },
    highlightHovered() {
      if (_.isEmpty(this.hovered)) return;
      this.chart.selectAll('.label-item').filter(l => l === this.hovered)
        .style('opacity', 1.0)
        .style('fill', SELECTED_COLOR_DARK)
        .style('font-weight', 'bold');
    },
    checkPresentLabel(array, label) {
      const match = array.filter(item => _.isEqual(item, label));
      return match[0];
    },
    selectNode(evt, d) {
      const modelId = !_.isEmpty(this.data.model) ? this.data.model.id : null;
      const obj = { concept: d, modelId };
      this.$emit('select-node', obj);
      evt.stopPropagation();
    },
    hoverNode(evt, d) {
      this.$emit('hover-node', d);
      evt.stopPropagation();
    },
    clearList(evt) {
      this.$emit('select-node', null);
      this.setSelectedNode({ node: null });
      evt.stopPropagation();
    },
    clearHover(evt) {
      this.$emit('hover-node', null);
      evt.stopPropagation();
    }
  }
};
</script>

