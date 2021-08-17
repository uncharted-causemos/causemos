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
          v-if="hasConstraints"
          type="button"
          class="btn first-button"
          @click="clearConstraints()">Clear Constraints
        </button>
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

<script lang="ts">

import _ from 'lodash';
import * as d3 from 'd3';
import { defineComponent, ref, computed, PropType } from 'vue';
import { useStore } from 'vuex';

import Modal from '@/components/modals/modal.vue';
import useOntologyFormatter from '@/services/composables/useOntologyFormatter';
import renderHistoricalProjectionsChart from '@/charts/scenario-renderer.js';
import { NodeScenarioData } from '@/types/CAG';

export default defineComponent({
  name: 'ModalEditConstraints',
  components: {
    Modal
  },
  props: {
    node: {
      type: Object,
      required: true
    },
    nodeScenarios: {
      type: Object as PropType<NodeScenarioData>,
      required: true
    },
    projectionSteps: {
      type: Number,
      required: true
    }
  },
  emits: [
    'run-projection', 'close', 'clear-constraints'
  ],
  setup(props) {
    const store = useStore();
    const constraints = ref([] as any);
    const selectedScenarioId = computed(() => store.getters['model/selectedScenarioId']);

    const indicatorUnit = computed(() => {
      return _.get(props.node, 'parameter.indicator_time_series_parameter.unit', 'unknown');
    });

    return {
      ontologyFormatter: useOntologyFormatter(),
      constraints,
      selectedScenarioId,
      indicatorUnit
    };
  },
  data: () => ({
    constraints: []
  }),
  computed: {
    ...mapGetters({
      selectedScenarioId: 'model/selectedScenarioId'
    }),
    hasConstraints() {
      return this.constraints.length > 0;
    },
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
    clearConstraints() {
      this.$emit('clear-constraints', { concept: this.node.concept });
    },
    formatted_concept_name() {
      return this.ontologyFormatter(this.node.concept);
    },
    render() {
      const selectedScenario = this.nodeScenarios.scenarios.find(s => s.id === this.selectedScenarioId);
      if (!selectedScenario) return;
      this.constraints = _.cloneDeep(selectedScenario.constraints || []);

      const svgEl = this.$refs['graph-container'] as SVGSVGElement;

      const svgWidth = svgEl.clientWidth;
      const svgHeight = svgEl.clientHeight;
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
        updateCallback: (newConstraints: any) => {
          this.constraints = newConstraints;
        }
      };

      const svg = d3.select(svgEl);
      renderHistoricalProjectionsChart(svg, this.nodeScenarios, renderOptions, runOptions);
    },
    close() {
      this.$emit('close', null);
    },
    run() {
      this.$emit('run-projection', { concept: this.node.concept, constraints: this.constraints });
    }
  }
});
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

::v-deep(.modal-container) {
  width: 70vw;
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
