<template>
  <div
    ref="container"
    class="data-analysis-control-panel-container h-100 flex flex-col">
    <div class="header">
      <h6
        v-tooltip="title"
        class="title"
      >
        {{ title }}
      </h6>
      <p class="source">{{ data && data.model }} - {{ data && data.source }}</p>
      <div class="scenario">
        <strong>Scenario:</strong>
        <div class="output-runs">
          <button
            type="button"
            class="btn analysis-control-panel-dropdown-btn"
            :disabled="!isRunSelected"
            @click="toggleRunDropdown"
          >
            <div class="button-text">
              {{ selectedRun ? selectedRun : { parameters: [] } | indicator-run-formatter }}
            </div>
            <i
              v-if="isRunSelected"
              class="fa fa-fw fa-angle-down"
            />
            <span v-else>No scenarios available</span>
          </button>
          <dropdown-control
            v-if="showDropdown"
            class="analysis-control-panel-dropdown-control"
          >
            <div
              slot="content"
            >
              <div
                v-for="run in runs"
                :key="run.id"
                class="dropdown-option"
                :class="{ 'dropdown-option-selected': selection && selection.runId === run.id }"
                @click="handleRunSelection(run.id)"
              >
                {{ run | indicator-run-formatter }}
              </div>
            </div>
          </dropdown-control>
        </div>
      </div>
    </div>
    <div class="main-panel flex flex-grow-1 h-0">
      <data-analysis-input-panel
        v-if="data && data.modelId"
        class="input-panel"
        :model-id="data.modelId"
        :output-variable="data.outputVariable"
        @runsupdated="updateRuns"
      />
      <div class="model-output">
        <div class="heading">
          <b class="text"> {{ data && data.outputVariable }} ({{ data && data.units }}) </b>
        </div>
        <span class="badge badge-default">
          {{ selectedDate }}: <b>{{ selectedDateValue }}</b>
        </span>
        <div class="map-container">
          <data-analysis-map
            class="map flex-grow-1"
            :selection="selection"
            :show-tooltip="true"
            @update-extent="onUpdateExtent"
          />
          <div class="value-filter">
            <div
              class="filter-toggle-button"
              :class="{ active: !!isFilterGlobal }"
              @click="toggleFilterGlobal">
              <i class="fa fa-filter" />
            </div>
            <slider-continuous-range
              v-if="outputExtent"
              v-model="range"
              :min="outputExtent.min"
              :max="outputExtent.max"
              :color-option="legendColor"
            />
            <div />
          </div>
        </div>
        <line-chart
          class="line-chart"
          :data="formattedTimeseriesData"
          :selected-time-slice-index="selectedTimeSliceIndex"
          :show-selection-actions="true"
          :config="linechartConfig"
          :enable-keystrokes="true"
          @selection="selectTimeStamp"
        />
        <disclaimer
          class="aggregation-message"
          :message="'An averaging function is used to aggregate the data.'"
        />
      </div>
    </div>
  </div>
</template>

<script>
import _ from 'lodash';
import * as d3 from 'd3';
import { mapActions, mapGetters } from 'vuex';
import API from '@/api/api';
import { getModelOutputColorOption } from '@/utils/model-output-util';
import DataAnalysisMap from '@/components/data/analysis-map';
import DataAnalysisInputPanel from '@/components/data/analysis-input-panel';
import LineChart from '@/components/widgets/charts/line-chart';
import SliderContinuousRange from '@/components/widgets/slider-continuous-range';
import Disclaimer from '@/components/widgets/disclaimer';
import DropdownControl from '@/components/dropdown-control';
import { DEFAULT_COLOR, SELECTED_COLOR_DARK } from '@/utils/colors-util';
import dateFormatter from '@/filters/date-formatter';
// Map filter animation fps rate (Use lower value if there's a performance issue)
const FILTER_ANIMATION_FPS = 15;
const TIME_SLIDER_CHANGE_DELAY = 300;
const valueFormatter = d3.format('.2s');

export default {
  name: 'AnalysisControlPanel',
  components: {
    DataAnalysisMap,
    LineChart,
    SliderContinuousRange,
    DataAnalysisInputPanel,
    DropdownControl,
    Disclaimer
  },
  props: {
    /**
     * {
     *   id
     *   modelId
     *   outputVariable
     *   filter
     *   selection
     * }
     */
    data: {
      type: Object,
      default: () => undefined
    }
  },
  data: () => ({
    runs: [],
    showDropdown: false,
    range: undefined,
    outputExtent: undefined,
    timeseries: []
  }),
  computed: {
    ...mapGetters({
      timeSelectionSyncing: 'dataAnalysis/timeSelectionSyncing'
    }),
    filter() {
      return this.data.filter;
    },
    isFilterGlobal() {
      return this.filter && this.filter.global;
    },
    filterRange() {
      return this.filter && this.filter.range;
    },
    selection() {
      const { id, modelId, outputVariable, selection } = this.data;
      return { id, modelId, outputVariable, ...selection };
    },
    selectedRun() {
      return this.runs.find(run => run.id === this.selection.runId);
    },
    isRunSelected() {
      return this.selectedRun !== undefined;
    },
    title() {
      const outputVariable = _.get(this.data, 'outputVariable');
      const units = _.get(this.data, 'units');
      const outputDescription = _.get(this.data, 'outputDescription');
      return `${outputVariable} (${units}) - ${outputDescription}`;
    },
    legendColor() {
      const { modelId, outputVariable } = this.data;
      return getModelOutputColorOption(modelId, outputVariable);
    },
    formattedTimeseriesData() {
      const formatted = [
        {
          name: '',
          color: DEFAULT_COLOR,
          series: this.timeseries
        }
      ];
      return formatted;
    },
    selectedDate() {
      const selectedTimestamp = _.get(this.selection, 'timestamp');
      return selectedTimestamp ? dateFormatter(selectedTimestamp, 'MMM YYYY') : '';
    },
    selectedDateValue() {
      return valueFormatter(_.get(this.timeseries[this.selectedTimeSliceIndex], 'value'));
    },
    selectedTimeSliceIndex() {
      const selectedTimestamp = _.get(this.selection, 'timestamp');
      return this.timeseries.findIndex(series => series.timestamp === selectedTimestamp);
    }
  },
  watch: {
    range: {
      handler() {
        this.updateFilterRange();
      },
      deep: true
    },
    selection() {
      this.fetchTimeseries();
    }
  },
  created() {
    this.SELECTED_COLOR_DARK = SELECTED_COLOR_DARK;
    this.linechartConfig = {
      margin: {
        top: 20,
        right: 30,
        bottom: 35,
        left: 45
      }
    };
  },
  mounted() {
    this.fetchTimeseries();
  },
  destroyed() {
    this.removeLocalFilter(this.data.id);
  },
  methods: {
    ...mapActions({
      updateFilter: 'dataAnalysis/updateFilter',
      removeFilter: 'dataAnalysis/removeFilter',
      updateSelection: 'dataAnalysis/updateSelection',
      updateAllTimeSelection: 'dataAnalysis/updateAllTimeSelection'
    }),
    selectRun(runId) {
      const { id } = this.data;
      this.updateSelection({
        analysisItemId: id,
        selection: { runId }
      });
    },
    updateRuns(runs) {
      this.runs = runs;

      const selectedRun = _.get(this.selection, 'runId');
      const found = this.runs.find(({ id }) => id === selectedRun);
      if (this.runs.length && !found) {
        this.selectRun(this.runs[0].id);
      }
    },
    async fetchTimeseries() {
      const { id, modelId, outputVariable, runId, timestamp } = this.selection;
      if (!modelId || !runId || !outputVariable) {
        this.timeseries = [];
        return;
      }
      const timeseries = (await API.get(`old/maas/output/${runId}/timeseries`, {
        params: {
          model: modelId,
          feature: outputVariable
        }
      })).data.timeseries;

      if (_.isEmpty(timeseries)) {
        this.timeseries = [];
        return;
      }

      this.timeseries = timeseries;
      // If time selection syncing is enabled, we shouldn't update time selection as a result
      //  of fetching data
      if (this.timeSelectionSyncing) return;
      // Otherwise, update timestamp selection with latest timestamp if it doesn't already exist
      //  or if the new timeseries doesn't contain the previously selected timestamp
      if (_.isNil(timestamp) || this.selectedTimeSliceIndex === -1) {
        this.updateSelection({ analysisItemId: id, selection: { runId, timestamp: _.last(this.timeseries).timestamp } });
      }
    },
    selectTimeStamp: _.debounce(function (timeIndex) {
      const { id } = this.data;
      const timestamp = _.get(this.timeseries, `[${timeIndex}].timestamp`);
      // When time selection syncing is enabled, update the selected time for all models with given timestamp,
      // otherwise update the timestamp of this model(modelId + outputVariable) only
      this.timeSelectionSyncing
        ? this.updateAllTimeSelection(timestamp)
        : this.updateSelection({ analysisItemId: id, selection: { timestamp } });
    }, TIME_SLIDER_CHANGE_DELAY),
    updateFilterRange: _.throttle(function () {
      if (!this.range || !this.data) return;
      this.updateFilter({
        analysisItemId: this.data.id,
        filter: { range: this.range }
      });
    }, 1000 / FILTER_ANIMATION_FPS),
    toggleFilterGlobal() {
      this.updateFilter({
        analysisItemId: this.data && this.data.id,
        filter: { global: !this.isFilterGlobal }
      });
    },
    handleRunSelection(runId) {
      this.selectRun(runId);
      this.toggleRunDropdown();
    },
    onUpdateExtent(extent) {
      this.outputExtent = extent;
      this.range = this.filterRange || this.outputExtent;
    },
    removeLocalFilter(filterId) {
      _.remove(this.filters, ({ id, global }) => id === filterId && !global);
    },
    toggleRunDropdown() {
      this.showDropdown = !this.showDropdown;
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";
@import "~styles/wm-theme/wm-theme";

.data-analysis-control-panel-container {
  position: relative;
  height: 100%;
  width: 60%;
  padding: 10px;
  background: white;
  background: $color-background-lvl-2;
  color: $color-text-base-dark;
  border: 1px solid #CACBCC;
  border-radius: 3px;

  span.badge {
    margin: 0px 1px;
  }
}
.header .title {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.source {
  color: $label-color;
  margin-bottom: 5px;
}
.main-panel {
  justify-content: space-between;
}
.input-panel {
  width: 30%;
  margin-right: 10px;

  /deep/ .facets-group-container {
    padding-right: 0;
  }
}
.scenario {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}
.output-runs {
  flex: 1;
  min-width: 0;
  padding-left: 10px;

  .analysis-control-panel-dropdown-control {
    position: absolute;
    max-height: 400px;
    overflow-y: auto;
  }
  .dropdown-option-selected {
    color: $selected-dark;
  }
  .analysis-control-panel-dropdown-btn {
    max-width: 100%;
    display: flex;
    align-items: center;

    .button-text {
      flex: 1;
      text-overflow: ellipsis;
      overflow: hidden;
    }
  }
}

.model-output {
  position: relative;
  width: 70%;
  display: flex;
  flex-direction: column;
  border: 1px solid #CACBCC;
  border-radius: 5px;
  padding: 10px 0;
  .heading {
    width: 100%;
    padding: 0 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  span.badge {
    margin: 5px 10px;
    align-self: start;
  }
  .map-container {
    position: relative;
    flex: 1;
  }
  .map {
    height: 100%;
  }

  .line-chart {
    height: 20%;
    width: 100%;
  }
  .value-filter {
    position: absolute;
    right: 5px;
    top: 5px;
    padding: 5px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    cursor: pointer;
    .filter-toggle-button {
      padding: 5px;
      border: 1px solid #888;
      border-radius: 3px;
      background-color: #ccc;
      &.active {
        background-color: #6FC5DE;
      }
    }
  }
}

.aggregation-message {
  padding-bottom: 0;
}
</style>
