<template>
  <div class="output-preview-timeline-container">
    <span
      v-if="isLoading"
      class="info-message"
    >
      Loading...
    </span>
    <span
      v-else-if="timeseries.length === 0"
      class="info-message"
    >
      The selected input data cubes do not have any time slices in common.
    </span>
    <!-- Pass v => '' to avoid showing values on hover/select -->
    <line-chart
      v-else
      class="line-chart"
      :data="formattedTimeseriesData"
      :selected-time-slice-index="selectedTimeSliceIndex"
      :value-formatter="v => ''"
      :show-selection-actions="true"
      :config="linechartConfig"
      @selection="selectTimeStamp"
    />
    <disclaimer
      v-if="!isLoading && timeseries.length !== 0"
      class="aggregate-value-disclaimer"
      :message="'Aggregated values for common time slices will be available once custom cube is ready.'"
    />
  </div>
</template>

<script>
import _ from 'lodash';
import API from '@/api/api';
import LineChart from '@/components/widgets/charts/line-chart';
import Disclaimer from '@/components/widgets/disclaimer';
import { mapActions, mapGetters } from 'vuex';
import { DEFAULT_COLOR } from '@/utils/colors-util';

const TIME_SLIDER_CHANGE_DELAY = 300;

export default {
  name: 'OutputPreviewTimeline',
  components: {
    LineChart,
    Disclaimer
  },
  data: () => ({
    timeseries: [],
    isLoading: false
  }),
  computed: {
    ...mapGetters({
      analysisItems: 'dataAnalysis/analysisItems',
      algebraicTransform: 'dataAnalysis/algebraicTransform',
      algebraicTransformInputIds: 'dataAnalysis/algebraicTransformInputIds'
    }),
    formattedTimeseriesData() {
      return [
        {
          name: '',
          color: DEFAULT_COLOR,
          series: this.timeseries
        }
      ];
    },
    selectedTimeSliceIndex() {
      // Stay in sync with first input (which should be synced with all other inputs)
      const selectedTimestamp = this.algebraicTransformInputs[0].selection.timestamp;
      return this.timeseries.findIndex(series => series.timestamp === selectedTimestamp) || -1;
    },
    algebraicTransformInputs() {
      return this.algebraicTransformInputIds.map(
        inputId => this.analysisItems.find(item => item.id === inputId)
      );
    }
  },
  created() {
    this.linechartConfig = {
      margin: {
        top: 20,
        right: 30,
        bottom: 40,
        left: 25
      }
    };
  },
  mounted() {
    this.fetchAllTimeseries();
  },
  methods: {
    ...mapActions({
      updateAllTimeSelection: 'dataAnalysis/updateAllTimeSelection'
    }),
    selectTimeStamp: _.debounce(function (timeIndex) {
      const timestamp = _.get(this.timeseries, `[${timeIndex}].timestamp`);
      this.updateAllTimeSelection(timestamp);
    }, TIME_SLIDER_CHANGE_DELAY),
    async fetchTimeseries(modelId, runId, outputVariable) {
      if (!modelId || !runId || !outputVariable) {
        return [];
      }
      const timeseries = (await API.get(`maas/output/${runId}/timeseries`, {
        params: {
          model: modelId,
          feature: outputVariable
        }
      })).data.timeseries;

      return _.isEmpty(timeseries) ? [] : timeseries;
    },
    async fetchAllTimeseries() {
      // FIXME: this is only called on mount, and relies on the fact that the current UI
      //  doesn't allow the user to change runs from this view.
      //  If the user can change inputs or selected runs, we'll need to re-fetch
      // FIXME: would be nice to only have to fetch timeseries for each input once,
      //  not here AND in that card. Caching service, anyone?
      // FIXME: watch for race conditions if this is called twice with different analysisItems
      // Fetch timeseries for each input
      this.isLoading = true;
      const fetchPromises = this.algebraicTransformInputs.map(input => {
        const { modelId, outputVariable, selection } = input;
        return this.fetchTimeseries(modelId, selection.runId, outputVariable);
      });
      const allTimeseries = await Promise.all(fetchPromises);
      // Find all timestamps that exist in every timeseries
      const intersection = _.intersectionBy(...allTimeseries, point => point.timestamp);
      // Value of each point is taken from first timeseries in `allTimeseries`
      //  Replace it with zero before storing, since we don't know the actual value.
      this.timeseries = intersection.map(point => ({ timestamp: point.timestamp, value: 0 }));
      if (intersection.length > 0) {
        this.updateAllTimeSelection(_.last(intersection).timestamp);
      }
      this.isLoading = false;
    }
  }
};
</script>

<style lang="scss" scoped>
.output-preview-timeline-container {
  position: relative;
}

.info-message {
  text-align: center;
  padding: 10px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.line-chart {
  height: 100%;
  width: 100%;
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

.aggregate-value-disclaimer {
  position: absolute;
  bottom: 0;
}
</style>
