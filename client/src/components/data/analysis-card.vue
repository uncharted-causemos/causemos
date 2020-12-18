<template>
  <div
    class="data-analysis-card-container"
    @click="onClick"
  >
    <div
      class="heading"
      @dblclick="toggleFullscreen"
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
      <b
        v-tooltip="heading"
        class="text"
      >
        {{ heading }}
      </b>
      <div
        v-if="hasFilter"
        class="has-filter-label">
        <i class="fa fa-filter filtered-card-icon" />
      </div>
      <options-button
        v-if="!isCheckboxVisible"
        class="menu"
        :dropdown-below="true"
        :wider-dropdown-options="true"
      >
        <div
          slot="content"
        >
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
        </div>
      </options-button>
    </div>
    <data-analysis-map
      class="card-map"
      :selection="selection"
      :show-tooltip="true"
      @on-map-load="onMapLoad"
    />
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
import { getModelRuns } from '@/services/datacube-service';
import DataAnalysisMap from '@/components/data/analysis-map';
import LineChart from '@/components/widgets/charts/line-chart';
import OptionsButton from '@/components/widgets/options-button';
import Disclaimer from '@/components/widgets/disclaimer';
import { DEFAULT_COLOR } from '@/utils/colors-util';
import messagesUtil from '@/utils/messages-util';

const TIME_SLIDER_CHANGE_DELAY = 300;

export default {
  name: 'AnalysisCard',
  components: {
    LineChart,
    DataAnalysisMap,
    OptionsButton,
    Disclaimer
  },
  props: {
    data: {
      type: Object,
      default: () => {}
    },
    isFocusedCardFullscreen: {
      type: Boolean,
      default: false
    }
  },
  data: () => ({
    timeseries: []
  }),
  computed: {
    ...mapGetters({
      timeSelectionSyncing: 'dataAnalysis/timeSelectionSyncing',
      algebraicTransform: 'dataAnalysis/algebraicTransform',
      algebraicTransformInputIds: 'dataAnalysis/algebraicTransformInputIds'
    }),
    hasFilter() {
      return this.data.filter && this.data.filter.global;
    },
    selection() {
      const { id, modelId, outputVariable, selection } = this.data;
      return { id, modelId, outputVariable, ...selection };
    },
    selectedRunId() {
      return _.get(this.selection, 'runId');
    },
    heading() {
      const outputVariable = _.get(this.data, 'outputVariable');
      const units = _.get(this.data, 'units');
      return `${outputVariable} (${units})`;
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
    isFullscreen() {
      return this.data.isFocused && this.isFocusedCardFullscreen;
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
    const { id, modelId } = this.data;
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
    onClick(e) {
      this.$emit('click', e);
    },
    onToggleSelected() {
      const { id } = this.data;
      this.toggleAlgebraicTransformInput(id);
    },
    toggleFullscreen(e) {
      this.$emit('toggle-fullscreen', e);
    },
    onMapLoad() {
      this.$emit('on-map-load');
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";
@import "~styles/wm-theme/wm-theme";

$fullscreenTransition: all .5s ease-in-out;

.data-analysis-card-container {
  background: white;
  padding: 5px 0;
  display: flex;
  flex-direction: column;

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
  }

  .has-filter-label {
    .filtered-card-icon {
      color: #6FC5DE;
    }
  }
}
.menu {
  position: relative;
  margin-left: 5px;
}
.card-map {
  flex: 3;
}
.input-params-container {
  font-size: 85%;
  margin-top: 10px;
  text-align: center;
  .input-label {
    color: #bbb;
    padding-right: 2px;
  }
  .input-value {
    text-align: left;
    padding-left: 2px;
  }
}
.line-chart {
  flex: 1;
  height: 0;
  padding: 0;
  /deep/ .x-axis .tick,
  /deep/ .y-axis {
    display: none
  }
  /deep/ .x-axis .tick:first-of-type,
  /deep/ .x-axis .tick:last-of-type
  {
    display: unset
  }
}
</style>
