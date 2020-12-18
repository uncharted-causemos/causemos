<template>
  <div class="indicator-summary-container">
    <div
      v-if="isIndicatorEmpty"
      class="indicator-summary-content"
    >
      <message-display :message="messageNoIndicator" />
    </div>
    <div
      v-else
      class="indicator-summary-content"
    >
      <h6>{{ indicator.indicator_name }}</h6>
      <p v-if="outputDescription !== null">
        {{ outputDescription }}</p>
      <div
        v-if="unit !== null"
        class="metadata-row"
      >
        <b>Units: </b> {{ unit }}
      </div>
      <div
        v-if="isKnownAdmin(selectedParameterOptions.country)"
        class="metadata-row"
      >
        <b>Country: </b> {{ selectedParameterOptions.country }}
      </div>
      <div
        v-if="isKnownAdmin(selectedParameterOptions.admin1)"
        class="metadata-row"
      >
        <b>Admin L1: </b> {{ selectedParameterOptions.admin1 }}
      </div>
      <div
        v-if="isKnownAdmin(selectedParameterOptions.admin2)"
        class="metadata-row"
      >
        <b>Admin L2: </b> {{ selectedParameterOptions.admin2 }}
      </div>
      <!-- <div
        v-if="isKnownAdmin(selectedParameterOptions.admin3)"
        class="metadata-row"
      >
        <b>Admin L3: </b> {{ selectedParameterOptions.admin3 }}
      </div>
      <div
        v-if="isKnownAdmin(selectedParameterOptions.admin4)"
        class="metadata-row"
      >
        <b>Admin L4: </b> {{ selectedParameterOptions.admin4 }}
      </div>
      <div
        v-if="isKnownAdmin(selectedParameterOptions.admin5)"
        class="metadata-row"
      >
        <b>Admin L5: </b> {{ selectedParameterOptions.admin5 }}
      </div> -->

      <line-chart
        v-if="chartData.length > 0"
        class="line-chart"
        :data="chartData"
        :marked-region="historicalRange"
      />
      <div class="metadata-row metadata-row--top-margin">
        <strong>Parameterization for baseline:</strong>
        <select
          v-model="selectedFunction"
          class="form-control input-sm"
        >
          <option
            v-for="func in availableFunctions"
            :key="func"
            :value="func">{{ func }}</option>
        </select>
      </div>

      <div class="metadata-row metadata-row--top-margin">
        <b class="choice-label">Dataset/Model: </b>
        <!-- FIXME: we're currently storing the model name as `indicator_source` in ES,
        which can be confusing given that there is another `source` field used commonly.
        Once the ES field is renamed, we can change this.-->
        <span>{{ indicator.indicator_source }}</span>
      </div>
      <p v-if="modelDescription !== null">{{ modelDescription }}</p>
      <div class="metadata-row"><strong>Source: </strong>{{ source }}</div>
    </div>
    <div class="footer-buttons">
      <hr class="pane-separator">
      <slot name="footer-buttons" />
    </div>
  </div>
</template>

<script>
import _ from 'lodash';
import API from '@/api/api';
import filtersUtil from '@/utils/filters-util';
import LineChart from '@/components/widgets/charts/line-chart';
import MessageDisplay from '@/components/widgets/message-display';
import { MARKER_COLOR, DEFAULT_COLOR } from '@/utils/colors-util';
import { SIDE_PANEL } from '@/utils/messages-util';


// FIXME: Simulating Delphi's aggregation functions, should resue Delphi
// when time resolution is fixed (eg: we can use both monthly and yearly)
const AGGREGATION_FUNCTIONS = {
  mean: _.mean,
  min: _.min,
  max: _.max,
  last: _.last,
  median: (values) => {
    const sorted = _.sortBy(values);
    const idx = 0.5 * sorted.length;
    if (sorted.length % 2 === 0) {
      return 0.5 * (sorted[Math.floor(idx) - 1] + sorted[Math.floor(idx)]);
    }
    return sorted[Math.floor(idx)];
  }
};

export default {
  name: 'IndicatorSummary',
  components: {
    LineChart,
    MessageDisplay
  },
  props: {
    node: {
      type: Object,
      required: true
    },
    modelSummary: {
      type: Object,
      required: true
    }
  },
  data: () => ({
    messageNoIndicator: SIDE_PANEL.INDICATORS_PANE_NO_INDICATOR,
    outputDescription: null,
    modelDescription: null,
    source: null,
    selectedFunction: null
  }),
  computed: {
    isIndicatorEmpty() {
      return _.isEmpty(this.selectedParameterOptions);
    },
    indicator() {
      if (_.isEmpty(this.node.parameter)) return {};
      return this.node.parameter;
    },
    selectedParameterOptions() {
      return this.indicator.indicator_time_series_parameter || {};
    },
    unit() {
      const value = this.selectedParameterOptions.unit;
      if (_.isNil(value)) return null;
      // Flag empty strings as missing
      return value === '' ? 'MISSING' : value;
    },
    initialValue() {
      if (this.selectedFunction === null) return 0.0;
      const func = AGGREGATION_FUNCTIONS[this.selectedFunction];
      const usableTimeseries = this.indicator.indicator_time_series.filter(d => {
        return d.timestamp >= this.historicalRange.start &&
          d.timestamp <= this.historicalRange.end;
      });

      return usableTimeseries.length > 0
        ? func(
          usableTimeseries
            .sort((a, b) => a.timestamp - b.timestamp)
            .map(dataPoint => dataPoint.value))
        : 0.0;
    },
    initialValueParameter() {
      return this.indicator.initial_value_parameter;
    },
    chartData() {
      if (_.isEmpty(this.indicator)) return [];
      const timeseries = this.indicator.indicator_time_series;
      const func = this.selectedFunction;
      return [
        {
          name: '',
          color: DEFAULT_COLOR,
          series: timeseries
        },
        {
          name: func,
          color: MARKER_COLOR,
          series: timeseries.map(d => ({ timestamp: d.timestamp, value: this.initialValue }))
        }
      ];
    },
    historicalRange() {
      return this.modelSummary.parameter.indicator_time_series_range;
    },
    availableFunctions() {
      return Object.keys(AGGREGATION_FUNCTIONS);
    }
  },
  watch: {
    indicator: {
      deep: true,
      handler() {
        this.selectedFunction = this.initialValueParameter.func || 'last';
        this.fetchMetadata();
      },
      immediate: true
    },
    selectedFunction(newValue, oldValue) {
      if (newValue === null || newValue === oldValue) return;
      this.onFunctionSelected();
    }
  },
  mounted() {
    this.fetchMetadata();
  },
  methods: {
    isKnownAdmin(selectedAdmin) {
      return !_.isEmpty(selectedAdmin) && selectedAdmin !== 'Unknown';
    },
    async fetchMetadata() {
      const {
        indicator_id: indicatorId,
        indicator_source: indicatorModel,
        indicator_time_series_parameter: indicatorTimeSeriesParameter
      } = this.indicator;

      if (_.isNil(indicatorId) || _.isNil(indicatorModel)) {
        this.outputDescription = null;
        this.source = null;
        this.modelDescription = null;
        return;
      }

      const unit = _.get(indicatorTimeSeriesParameter, 'unit', null);

      const filters = filtersUtil.newFilters();
      filtersUtil.addSearchTerm(filters, 'variable', indicatorId, 'and', false);
      filtersUtil.addSearchTerm(filters, 'model', indicatorModel, 'and', false);
      filtersUtil.addSearchTerm(filters, 'type', 'indicator', 'and', false);
      if (unit) {
        filtersUtil.addSearchTerm(filters, 'output_units', unit, 'and', false);
      }
      const result = await API.get(`maas/datacubes?filters=${encodeURI(JSON.stringify(filters))}`);
      if (result.status !== 200) {
        console.error('Failed to fetch metadata for indicator:', { indicatorId, indicatorModel });
        return;
      }

      let indicators = result.data || [];
      if (indicators.length > 1 && !_.isNil(unit)) {
        indicators = indicators.filter(i => i.output_units === unit);
      }
      if (indicators.length === 1) {
        const {
          output_description: outputDescription,
          source,
          model_description: modelDescription
        } = indicators[0];
        this.outputDescription = outputDescription;
        this.source = source;
        this.modelDescription = modelDescription;
      }
    },
    onFunctionSelected() {
      this.$emit('function-selected', {
        initial_value: this.initialValue,
        initial_value_parameter: {
          func: this.selectedFunction
        }
      });
    }
  }
};
</script>

<style lang="scss" scoped>

  .indicator-summary-content {
    padding: 0;
    display: flex;
    position: relative;
    flex-direction: column;
    overflow-wrap: break-word;
    width: 100%;
    overflow-y: auto;
    padding-bottom: 70px;
  }

  .footer-buttons {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    padding: 0 8px 10px 10px;
    background: white;

    hr {
      margin-bottom: 10px;
    }
  }

  .line-chart {
    flex: 1;
    max-height: 30vh;
  }

  .metadata-row {
    margin-bottom: 5px;

    &--top-margin {
      margin-top: 25px;
    }
  }

  .input-sm {
    display: inline-block;
    width: auto;
    margin-left: 5px;
  }
</style>
