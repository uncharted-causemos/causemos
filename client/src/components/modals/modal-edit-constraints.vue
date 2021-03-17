<template>
  <modal @close="close()">
    <template #header>
      <h4> <div class="concept-circle" /> {{ formatted_concept_name() }} </h4>
    </template>
    <template #body>
      <h6 class="indicator-metadata">
        <i class="fa fa-fw fa-table" />
        {{ node.parameter.indicator_name }}
        ({{ indicatorUnit }})
      </h6>
      <svg
        ref="graph-container"
        class="constraints-container" />
      <p class="instructions">
        <i class="fa fa-fw fa-info-circle" />
        To create a scenario, set some values by clicking on the chart. To remove a point, click on it again.
      </p>
    </template>
    <template #footer>
      <ul class="unstyled-list">
        <button
          type="button"
          class="btn first-button"
          @click.stop="close()">Cancel
        </button>
        <button
          type="button"
          class="btn btn-primary btn-call-for-action"
          @click.stop="run()">Run
        </button>
      </ul>
    </template>
  </modal>
</template>

<script>

import _ from 'lodash';
import * as d3 from 'd3';
import { mapGetters } from 'vuex';

import Modal from '@/components/modals/modal';
import renderHistoricalProjectionsChart from '@/charts/scenario-renderer';
import ontologyFormatter from '@/formatters/ontology-formatter';

export default {
  name: 'ModalEditConstraints',
  components: {
    Modal
  },
  props: {
    node: {
      type: Object,
      required: true
    },
    scenarios: {
      type: Object,
      required: true
    },
    projectionSteps: {
      type: Number,
      required: true
    }
  },
  emits: [
    'run-projection', 'close'
  ],
  data: () => ({
    constraints: []
  }),
  computed: {
    ...mapGetters({
      selectedScenarioId: 'model/selectedScenarioId'
    }),
    indicatorUnit() {
      const unit = _.get(this.node, 'parameter.indicator_time_series_parameter.unit', 'unknown');
      return `unit: ${unit}`;
    }
  },
  watch: {
    selectedScenarioId() {
      this.render();
    }
  },
  mounted() {
    this.render();
  },
  methods: {
    formatted_concept_name() {
      return ontologyFormatter(this.node.concept);
    },
    render() {
      const selectedScenario = this.scenarios.scenarios.find(s => s.id === this.selectedScenarioId);
      this.constraints = _.cloneDeep(selectedScenario.constraints);

      const svgWidth = this.$refs['graph-container'].clientWidth;
      const svgHeight = this.$refs['graph-container'].clientHeight;
      const renderOptions = {
        margin: {
          top: 0, bottom: 25, left: 45, right: 20
        },
        viewport: {
          x1: 0, y1: 0, x2: svgWidth, y2: svgHeight
        }
      };
      const runOptions = {
        selectedScenarioId: this.selectedScenarioId,
        miniGraph: false,
        updateCallback: (newConstraints) => {
          this.constraints = newConstraints;
        }
      };

      const svg = d3.select(this.$refs['graph-container']);
      renderHistoricalProjectionsChart(svg, this.scenarios, renderOptions, runOptions);
    },
    close() {
      this.$emit('close', null);
    },
    run() {
      this.$emit('run-projection', { concept: this.node.concept, constraints: this.constraints });
    }
  }
};
</script>

<style scoped lang="scss">

.constraints-container {
  height: 250px;
  width: 100%;
}

.model-header {
  display: none;
}

.concept-circle {
  background: black;
  height: 1.25rem;
  width: 1.25rem;
  display: inline-block;
  border-radius: 50%;
  margin-right: 5px;
}

/deep/ .modal-container {
  width: 70vw;
}

/deep/ .modal-body {
  padding: 10px 20px;
}

.first-button {
  margin-right: 10px;
}

.indicator-metadata {
  margin: 0;
  margin-bottom: 10px;
  font-weight: normal;
}

.instructions {
  margin: 0;
  margin-top: 5px;
}

</style>
