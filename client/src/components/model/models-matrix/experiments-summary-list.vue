<template>
  <div>
    <div class="flex">
      <div class="concept-label"><b>Concept</b></div>
      <div><b>Experiments</b></div>
    </div>
    <div
      v-for="indicator of indicators"
      :key="indicator.concept_name"
      :style="{'height': `${config.itemHeight}px`, 'background-color': calculateColor(indicator.concept_name)}"
      class="flex experiment-container">
      <div
        class="concept-label"
        :style="{ opacity: calculateOpacity(indicator.concept_name) }">
        {{ indicator.concept_name | ontology-formatter }}
      </div>
      <div :style="{ opacity: calculateOpacity(indicator.concept_name) }">
        <summary-chart
          :indicator="indicator"
          :experiments="experimentResults[indicator.concept_name]"
          :config="config"
          :domain="calculateDomain(indicator, experimentResults[indicator.concept_name])"
          :selected-experiment-id="selectedExperimentId"
          @select-experiment="setSelectedExperimentId"
        />
      </div>
    </div>
  </div>
</template>

<script>
import _ from 'lodash';
import * as d3 from 'd3';
import { mapGetters, mapActions } from 'vuex';

import SummaryChart from '@/components/projections/summary-chart';
import {
  calculateExperimentsDomain,
  calculateIndicatorDomain,
  DYSE_PROJECTION_DOMAIN
} from '@/utils/projection-util';
import { SELECTED_COLOR_RGBA } from '@/utils/colors-util';

export default {
  name: 'ExperimentsSummaryList',
  components: {
    SummaryChart
  },
  props: {
    indicators: {
      type: Array,
      default: () => []
    },
    experimentResults: {
      type: Object,
      default: () => ({})
    },
    highlights: {
      type: Object,
      default: () => ({})
    }
  },
  computed: {
    ...mapGetters({
      engine: 'app/engine',
      selectedExperimentId: 'app/selectedExperimentId'
    }),
    height() {
      const height = this.config.itemHeight;
      return { height: height + 'px' };
    }
  },
  created() {
    this.config = {
      itemHeight: 60,
      margin: { top: 10, right: 5, bottom: 10, left: 35 }
    };
  },
  methods: {
    ...mapActions({
      setSelectedExperimentId: 'app/setSelectedExperimentId'
    }),
    calculateDomain(indicator, experiments) {
      const indicatorDomain = calculateIndicatorDomain(indicator);
      const experimentsDomain = calculateExperimentsDomain(experiments.map(e => e.results));
      const yCombined = d3.extent([...indicatorDomain.y, ...experimentsDomain.y]);

      return {
        x: experimentsDomain.x,
        y: this.engine === 'dyse' ? DYSE_PROJECTION_DOMAIN : yCombined
      };
    },
    calculateOpacity(concept) {
      if (_.isEmpty(this.highlights)) return;
      if (this.highlights.nodes && this.highlights.nodes.length > 0 && !this.highlights.nodes.includes(concept)) {
        return 0.5;
      }
      return 1.0;
    },
    calculateColor(concept) {
      if (this.highlights && this.highlights.selectedNode === concept) {
        return SELECTED_COLOR_RGBA; // Selected color
      }
      return 'transparent';
    }
  }
};
</script>

<style lang="scss" scoped>
.concept-label {
  display: flex;
  width: 150px;
  height: 100%;
  cursor: pointer;
  align-items: center;
}

.experiment-container {
  padding: 2px;
  box-sizing: border-box;
  margin: 2px;
  border: 2px solid transparent;
}
</style>
