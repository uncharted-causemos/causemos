<template>
  <div class="input-card-container">
    <div class="heading">
      <b
        v-tooltip="heading"
        class="text"
      >
        {{ heading }}
      </b>
    </div>
    <data-analysis-map
      class="card-map"
      :selection="analysisItem"
      :show-tooltip="true"
    />
    <line-chart
      class="line-chart"
      :data="formattedTimeseriesData"
      :selected-time-slice-index="selectedTimeSliceIndex"
      :show-selection-actions="true"
      :config="linechartConfig"
      @selection="selectTimeStamp"
    />
  </div>
</template>

<script>
import _ from 'lodash';
import API from '@/api/api';
import { getModelRuns } from '@/services/datacube-service';
import DataAnalysisMap from '@/components/data/analysis-map';
import LineChart from '@/components/widgets/charts/line-chart';
import { DEFAULT_COLOR } from '@/utils/colors-util';
import { mapActions, mapGetters } from 'vuex';

const TIME_SLIDER_CHANGE_DELAY = 300;

export default {
  name: 'InputCard',
  components: {
    LineChart,
    DataAnalysisMap
  },
  props: {
    analysisItemId: {
      type: String,
      required: true
    }
  },
  data: () => ({
    timeseries: []
  }),
  computed: {
    ...mapGetters({
      analysisItems: 'dataAnalysis/analysisItems'
    }),
    analysisItem() {
      const analysisItem = this.analysisItems.find(item => item.id === this.analysisItemId);
      const { id, modelId, outputVariable, selection, units } = analysisItem;
      return { id, modelId, outputVariable, units, ...selection };
    },
    heading() {
      return `${this.analysisItem.outputVariable} (${this.analysisItem.units})`;
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
      const selectedTimestamp = this.analysisItem.timestamp;
      return this.timeseries.findIndex(series => series.timestamp === selectedTimestamp);
    }
  },
  watch: {
    analysisItem() {
      this.fetchTimeseries();
    }
  },
  created() {
    this.linechartConfig = {
      margin: {
        top: 20,
        right: 30,
        bottom: 30,
        left: 25
      }
    };
  },
  async mounted() {
    const { id, modelId, runId } = this.analysisItem;
    if (!runId) {
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
      updateSelection: 'dataAnalysis/updateSelection',
      updateAllTimeSelection: 'dataAnalysis/updateAllTimeSelection'
    }),
    async fetchDefaultRun(modelId) {
      // TODO: Fetch only the first run as a default by using limit and sort_by parameters. This requires backend api support.
      const data = await getModelRuns(modelId);
      // Set the first(latest) run as default run.
      return data[0];
    },
    async fetchTimeseries() {
      const { id, modelId, runId, outputVariable, timestamp } = this.analysisItem;
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
      if (_.isNil(timestamp)) {
        // update timestamp selection with latest timestamp if not already exist
        this.updateSelection({ analysisItemId: id, selection: { runId, timestamp: _.last(this.timeseries).timestamp } });
      }
    },
    selectTimeStamp: _.debounce(function (timeIndex) {
      const timestamp = _.get(this.timeseries, `[${timeIndex}].timestamp`);
      // Time syncing is always enabled when previewing a custom cube
      this.updateAllTimeSelection(timestamp);
    }, TIME_SLIDER_CHANGE_DELAY)
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.input-card-container {
  background: white;
  padding: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid $separator;
  border-radius: 3px;
}
.heading {
  height: 32px;
  margin: 5px 0;
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
}
.card-map {
  flex: 3;
}
.line-chart {
  flex: 1;
  height: 0;
  padding: 0;
  margin-bottom: 5px;
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
