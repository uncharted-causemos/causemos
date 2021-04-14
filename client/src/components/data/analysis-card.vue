<template>
  <div
    class="data-analysis-card-container"
    @click="onClick"
  >
    <div
      class="heading"
      @click="toggleFullscreen"
    >
      <i
        v-if="isCheckboxVisible"
        class="fa fa-lg fa-fw"
        :class="{
          'fa-check-square-o': isSelected,
          'fa-square-o': !isSelected,
          'disabled': !isSelected && !canSelectMoreCubes
        }"
        @click.stop="onToggleSelected"
        @dblclick.stop=""
      />
      <span
        v-tooltip.top-start="'View details for ' + heading"
        class="text"
      >
        {{ heading }}
      </span>
      <span
        v-if="isFullscreen"
        class="source"
      >Source: {{ data && data.model }} - {{ data && data.source }}</span>
      <options-button
        v-if="!isCheckboxVisible"
        class="menu"
        :dropdown-below="true"
        :wider-dropdown-options="true"
      >
        <template #content>
          <div
            v-if="isFullscreen"
            class="dropdown-option"
            @click="toggleFullscreen"
          >
            <i class="fa fa-fw fa-compress" />
            Exit Details View
          </div>
          <div
            v-else
            class="dropdown-option"
            @click="toggleFullscreen"
          >
            <i class="fa fa-fw fa-expand" />
            Details
          </div>
          <div
            class="dropdown-option"
            @click="removeAnalysisItems([data.id])"
          >
            <i class="fa fa-fw fa-minus-circle" />
            Remove
          </div>
        </template>
      </options-button>
    </div>
    <div
      v-if="isFullscreen"
      class="scenario"
    >
      <span>Scenario:</span>
      <div class="output-runs">
        <button
          type="button"
          class="btn dropdown-btn"
          :disabled="!isRunSelected"
          @click="toggleRunDropdown"
        >
          <div class="button-text">
            {{ indicatorRunFormatter(selectedRun ? selectedRun : { parameters: [] }) }}
          </div>
          <i
            v-if="isRunSelected"
            class="fa fa-fw fa-angle-down"
          />
          <span v-else>No scenarios available</span>
        </button>
        <dropdown-control
          v-if="isRunDropdownOpen"
          class="dropdown-control">
          <template #content>
            <div
              v-for="run in runs"
              :key="run.id"
              class="dropdown-option"
              :class="{ 'dropdown-option-selected': selection && selection.runId === run.id }"
              @click="handleRunSelection(run.id)"
            >
              {{ indicatorRunFormatter(run) }}
            </div>
          </template>
        </dropdown-control>
      </div>
    </div>
    <div class="columns">
      <!--
      <data-analysis-input-panel
        v-if="isFullscreen && data && data.modelId"
        class="input-panel"
        :model-id="data.modelId"
        :output-variable="data.outputVariable"
        @runsupdated="updateRuns"
      />
      -->
      <div style="display: flex; flex-direction: column">
        <button
          type="button"
          class="btn dropdown-btn"
          @click="isDrilldownDropdownOpen = !isDrilldownDropdownOpen"
        >
          <div class="button-text">
            Drilldown Filters
            <i
              class="fa fa-fw"
              :class="{ 'fa-angle-down': !isDrilldownDropdownOpen, 'fa-angle-up': isDrilldownDropdownOpen }"
            />
          </div>
        </button>
        <dropdown-control
          v-if="isDrilldownDropdownOpen"
          class="dropdown-control"
          style="position: absolute">
          <template #content>
            <div
              v-for="filter in drilldownParameters"
              :key="filter.id"
              class="dropdown-option"
            >
              {{ filter.name }}
            </div>
          </template>
        </dropdown-control>
        <parallel-coordinates-chart
          v-if="dimensionsData"
          :dimensions-data="dimensionsData"
          :selected-dimensions="selectedDimensions"
          :ordinal-dimensions="ordinalDimensions"
          apply-default-selection="true"
          @select-scenario="updateScenarioSelection"
        />
      </div>
      <data-analysis-map
        class="card-map"
        :class="{'full-width': !isFullscreen}"
        :selection="selection"
        :show-tooltip="true"
        @on-map-load="onMapLoad"
      />
    </div>
    <line-chart
      class="line-chart"
      :data="formattedTimeseriesData"
      :selected-time-slice-index="selectedTimeSliceIndex"
      :show-selection-actions="true"
      :config="linechartConfig"
      @selection="selectTimeStamp"
    />
    <disclaimer
      :message="'An averaging function is used to aggregate the data.'"
      class="aggregation-message"
      :class="{ 'isVisible': isFullscreen }"
    />
  </div>
</template>

<script>
import _ from 'lodash';
import API from '@/api/api';
import { mapActions, mapGetters } from 'vuex';
import { getModelRuns, getModelParameters } from '@/services/datacube-service';
import DataAnalysisMap from '@/components/data/analysis-map';
import DropdownControl from '@/components/dropdown-control';
import LineChart from '@/components/widgets/charts/line-chart';
import OptionsButton from '@/components/widgets/options-button';
import Disclaimer from '@/components/widgets/disclaimer';
import { DEFAULT_COLOR } from '@/utils/colors-util';
import messagesUtil from '@/utils/messages-util';
import indicatorRunFormatter from '@/formatters/indicator-run-formatter';
import ParallelCoordinatesChart from '@/components/widgets/charts/parallel-coordinates.vue';

const TIME_SLIDER_CHANGE_DELAY = 300;

export default {
  name: 'AnalysisCard',
  components: {
    LineChart,
    DataAnalysisMap,
    OptionsButton,
    Disclaimer,
    // DataAnalysisInputPanel,
    DropdownControl,
    ParallelCoordinatesChart
  },
  props: {
    data: {
      type: Object,
      default: () => {}
    },
    isFullscreen: {
      type: Boolean,
      default: null
    }
  },
  emits: [
    'click'
  ],
  data: () => ({
    runs: [],
    timeseries: [],
    isRunDropdownOpen: false,
    dimensionsData: null,
    selectedDimensions: null,
    ordinalDimensions: null,
    drilldownParameters: [],
    isDrilldownDropdownOpen: false
  }),
  computed: {
    ...mapGetters({
      timeSelectionSyncing: 'dataAnalysis/timeSelectionSyncing',
      algebraicTransform: 'dataAnalysis/algebraicTransform',
      algebraicTransformInputIds: 'dataAnalysis/algebraicTransformInputIds'
    }),
    selection() {
      const { id, modelId, outputVariable, selection } = this.data;
      return { id, modelId, outputVariable, ...selection };
    },
    selectedRunId() {
      return _.get(this.selection, 'runId');
    },
    selectedRun() {
      return this.runs.find(run => run.id === this.selectedRunId);
    },
    isRunSelected() {
      return this.selectedRun !== undefined;
    },
    heading() {
      const outputVariable = _.get(this.data, 'outputVariable');
      const units = _.get(this.data, 'units');
      let result = `${outputVariable} (${units})`;
      if (this.isFullscreen) {
        const outputDescription = _.get(this.data, 'outputDescription');
        result += ` - ${outputDescription}`;
      }
      return result;
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
    selectedTimeSliceIndex() {
      const selectedTimestamp = _.get(this.selection, 'timestamp');
      return this.timeseries.findIndex(series => series.timestamp === selectedTimestamp);
    },
    isCheckboxVisible() {
      return !_.isNil(this.algebraicTransform);
    },
    isSelected() {
      return !_.isNil(this.algebraicTransformInputIds.find(inputId => inputId === this.data.id));
    },
    canSelectMoreCubes() {
      return this.isCheckboxVisible &&
        (this.algebraicTransform.maxInputCount === null ||
          this.algebraicTransformInputIds.length < this.algebraicTransform.maxInputCount);
    }
  },
  watch: {
    selection() {
      this.fetchTimeseries();
    }
  },
  created() {
    this.emptyInputParams = messagesUtil.EMPTY_INPUT_PARAMS;
    this.linechartConfig = {
      margin: {
        top: 20,
        right: 30,
        bottom: 30,
        left: 25
      }
    };
    this.lineChartSize = [230, 70];
  },
  async mounted() {
    const { id, model, modelId, outputVariable, outputDescription } = this.data;

    //
    // initial effort to hook the PC to the data view to load real data cubes
    //
    const [runs, parameters] = (await Promise.all([
      getModelRuns(modelId),
      // getModelRunOutputs(modelId),
      getModelParameters(modelId)
    ]));
    const fullOutputVarName = 'total_' + outputVariable;
    const paramDefaults = {};
    for (const p of parameters) {
      paramDefaults[p.name] = p.default;
    }
    let baselineDefaultOutput;
    // first,
    //  for each run, add the output variable value and save run-id and model (id)
    for (const run of runs) {
      // const timeseries = (await API.get(`maas/output/${run.id}/timeseries`, {
      //   params: {
      //     model: modelId,
      //     feature: outputVariable
      //   }
      // })).data.timeseries;

      // const sum = timeseries.reduce((a, b) => a + b.value, 0);
      // const avg = (sum / timeseries.length) || 0;
      const avg = Math.random() * (100 - 0) + 0;

      const outputVal = avg;

      run.parameters.push({ name: 'id', value: run.id });
      run.parameters.push({ name: 'model', value: run.model });
      run.parameters.push({ name: fullOutputVarName, value: outputVal });

      // find run that match the baseline defaults and save it
      let found = true;
      for (const runParam in run.parameters) {
        if (paramDefaults[runParam.name] !== runParam.value) {
          found = false;
        }
      }
      run.baseline = found;
      if (run.baseline) {
        baselineDefaultOutput = outputVal;
      }
    }
    // each original run is processed to actually reference to its parameters array
    const allRunsParams = runs.map(run => run.parameters);
    const allProcessedRunsParams = [];
    allRunsParams.forEach(runParams => {
      const run = runParams.reduce(
        (obj, item) => Object.assign(obj, { [item.name]: item.value }), {}
      );
      allProcessedRunsParams.push(run);
    });

    // FIXME: TEMP
    if (model === 'DSSAT') {
      allProcessedRunsParams.forEach(r => {
        if (r.rainfall_multiplier === '1' || r.rainfall_multiplier === '1.0') {
          r.rainfall_multiplier = '1.0';
        }
      });
      const indx = parameters.findIndex(p => p.name === 'rainfall_multiplier');
      if (parameters[indx].default === '1' || parameters[indx].default === '1.0') {
        parameters[indx].default = '1.0';
      }
      this.ordinalDimensions = ['rainfall_multiplier'];
    }

    this.dimensionsData = allProcessedRunsParams;

    // second
    // augment each param by its type (e.g., input, output, drilldown/filter)
    // extract param names from the model parameters, noting this will exclude manually added attributes such as id and model
    //
    // mock code, assign types to parameters
    // TODO: add min/max for numerical param
    for (const param of parameters) {
      // special case for some DSSAT parameters
      if (model === 'DSSAT' &&
         (
           param.name === 'region' ||
           param.name === 'crop' ||
           param.name === 'season'
         )) {
        param.type = 'drilldown';
      } else {
        param.type = 'input';
      }
    }
    // add the output variable since it is not usually added to the list of parameters
    parameters.push({
      name: fullOutputVarName,
      description: outputDescription,
      type: 'output',
      default: baselineDefaultOutput
    });

    this.selectedDimensions = parameters;

    // add drilldown params
    this.drilldownParameters = parameters.filter(p => p.type === 'drilldown');
    //
    // end of PC real data association

    if (!this.selectedRunId) {
      const defaultRun = await this.fetchDefaultRun(modelId);
      this.updateSelection({
        analysisItemId: id,
        selection: { runId: defaultRun.id }
      });
    }
    this.fetchTimeseries();
  },
  methods: {
    ...mapActions({
      removeAnalysisItems: 'dataAnalysis/removeAnalysisItems',
      updateSelection: 'dataAnalysis/updateSelection',
      updateAllTimeSelection: 'dataAnalysis/updateAllTimeSelection',
      toggleAlgebraicTransformInput: 'dataAnalysis/toggleAlgebraicTransformInput'
    }),
    indicatorRunFormatter,
    async fetchDefaultRun(modelId) {
      // TODO: Fetch only the first run as a default by using limit and sort_by parameters. This requires backend api support.
      const data = await getModelRuns(modelId);
      // Set the first(latest) run as default run.
      return data[0];
    },
    async fetchTimeseries() {
      const { id, modelId, runId, outputVariable, timestamp } = this.selection;
      if (!modelId || !runId || !outputVariable) {
        this.timeseries = [];
        return;
      }
      const timeseries = (await API.get(`maas/output/${runId}/timeseries`, {
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
    onClick(e) {
      this.$emit('click', e);
    },
    toggleBaselineDefaultsVisibility() {
      this.baselineDefaultChecked = !this.baselineDefaultChecked;
    },
    updateScenarioSelection(e) {
      let lineData;
      if (e.scenarios.length > 1) {
      // TEMP: only pick the last selected line
        lineData = e.scenarios[e.scenarios.length - 1];
      } else {
        lineData = e.scenarios[0];
      }
      const runId = lineData ? lineData.id : undefined;
      // const model = e.model;
      // console.log('update selection for run id: ' + runId);
      this.selectRun(runId);
    },
    onToggleSelected() {
      this.toggleAlgebraicTransformInput(this.data.id);
    },
    toggleFullscreen() {
      this.$emit('set-card-fullscreen', this.isFullscreen ? null : this.data.id);
    },
    onMapLoad() {
      this.$emit('on-map-load');
    },
    toggleRunDropdown() {
      this.isRunDropdownOpen = !this.isRunDropdownOpen;
    },
    handleRunSelection(runId) {
      this.selectRun(runId);
      this.toggleRunDropdown();
    },
    updateRuns(runs) {
      this.runs = runs;

      const selectedRun = _.get(this.selection, 'runId');
      const found = this.runs.find(({ id }) => id === selectedRun);
      if (this.runs.length && !found) {
        this.selectRun(this.runs[0].id);
      }
    },
    selectRun(runId) {
      const { id } = this.data;
      this.updateSelection({
        analysisItemId: id,
        selection: { runId }
      });
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";

$fullscreenTransition: all .5s ease-in-out;

.data-analysis-card-container {
  background: white;
  padding: 5px 0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 4px rgba(39, 40, 51, 0.12);

  .aggregation-message {
    padding-bottom: 5px;
    height: 0;
    opacity: 0;
    transition: $fullscreenTransition;

    &.isVisible {
      opacity: 1;
      // Hardcode height to enable animation
      height: 34px;
    }

    &:not(.isVisible) {
      padding: 0;
    }
  }
}
.heading {
  height: 32px;
  margin-bottom: 5px;
  cursor: pointer;
  user-select: none;
  padding: 0 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .text {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: $font-size-large;
  }
}

.heading:hover {
  color: $selected-dark;
  text-decoration:underline;
}

.scenario {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
  margin-left: 10px;
}

.output-runs {
  flex: 1;
  min-width: 0;
  padding-left: 10px;

  .dropdown-control {
    position: absolute;
    max-height: 400px;
    overflow-y: auto;
  }
  .dropdown-option-selected {
    color: $selected-dark;
  }
  .dropdown-btn {
    max-width: 100%;
    display: flex;
    align-items: center;
    font-weight: normal;

    .button-text {
      flex: 1;
      text-overflow: ellipsis;
      overflow: hidden;
    }
  }
}

.menu {
  position: relative;
  margin-left: 5px;
}

.columns {
  flex: 3;
  display: flex;
  min-height: 0;
  flex-basis: inherit;
}

.input-panel {
  width: 30%;
}

.card-map {
  height: 100%;
  width: 70%;

  &.full-width {
    width: 100%;
  }
}

.line-chart {
  flex: 1;
  height: 0;
  padding: 0;
  ::v-deep(.x-axis .tick),
  ::v-deep(.y-axis) {
    display: none;
  }
  ::v-deep(.x-axis .tick:first-of-type),
  ::v-deep(.x-axis .tick:last-of-type)
  {
    display: unset;
  }
}

.baseline-checkbox {
    display: inline-block;
    label {
      font-weight: normal;
      cursor: pointer;
      margin: 0;
    }
  }
</style>
