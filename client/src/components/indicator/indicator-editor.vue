<template>
  <div class="indicator-editor-container">
    <div class="left-column">
      <div v-if="indicator !== null">
        <h6>{{ indicator.output_name }}</h6>
        <span v-if="indicator.output_description !== undefined">{{ indicator.output_description }}</span>
      </div>
      <!-- Unit -->
      <div class="metadata-row metadata-row--top-margin">
        <b class="choice-label">Units</b>
        <span v-if="availableUnits.length === 1">
          {{ availableUnits[0] === '' ? 'MISSING' : availableUnits[0] }}
        </span>
        <select
          v-else-if="availableUnits.length > 1"
          v-model="selectedUnit"
          class="form-control input-sm"
          @change="setUnit()">
          <option
            v-for="unit in availableUnits"
            :key="unit"
            :value="unit">{{ unit }}</option>
        </select>
      </div>
      <!-- Country -->
      <div
        v-if="hasSelectableAdmins(availableAdmin0s)"
        class="metadata-row"
      >
        <b class="choice-label">Country</b>
        <span v-if="availableAdmin0s.length === 1">
          {{ availableAdmin0s[0] === '' ? 'MISSING' : availableAdmin0s[0] }}
        </span>
        <select
          v-else
          v-model="selectedAdmin0"
          class="form-control input-sm"
          @change="setAdminLevel(0)">
          <option
            v-for="admin0 in availableAdmin0s"
            :key="admin0"
            :value="admin0">{{ admin0 }}</option>
        </select>
      </div>
      <!-- Admin level 1-->
      <div
        v-if="hasSelectableAdmins(availableAdmin1s)"
        class="metadata-row"
      >
        <b class="choice-label">Admin L1</b>
        <span v-if="availableAdmin1s.length === 1">
          {{ availableAdmin1s[0] === '' ? 'MISSING' : availableAdmin1s[0] }}
        </span>
        <select
          v-else
          v-model="selectedAdmin1"
          class="form-control input-sm"
          @change="setAdminLevel(1)">
          <option
            v-for="admin1 in availableAdmin1s"
            :key="admin1"
            :value="admin1">{{ admin1 }}</option>
        </select>
      </div>
      <!-- Admin level 2 -->
      <div
        v-if="hasSelectableAdmins(availableAdmin2s)"
        class="metadata-row"
      >
        <b class="choice-label">Admin L2</b>
        <span v-if="availableAdmin2s.length === 1">
          {{ availableAdmin2s[0] === '' ? 'MISSING' : availableAdmin2s[0] }}
        </span>
        <select
          v-else
          v-model="selectedAdmin2"
          class="form-control input-sm"
          @change="setAdminLevel(2)">
          <option
            v-for="admin2 in availableAdmin2s"
            :key="admin2"
            :value="admin2">{{ admin2 }}</option>
        </select>
      </div>
      <!-- Dataset/Model -->
      <div
        class="metadata-row metadata-row--top-margin"
      >
        <b class="choice-label">Dataset/Model</b>
        <span>{{ indicator.model }}</span>
      </div>
      <p v-if="indicator.model_description !== undefined">
        {{ indicator.model_description }}
      </p>
      <div
        class="metadata-row"
      >
        <b class="choice-label">Source</b>
        <a
          v-if="isSourceValidUrl"
          :href="indicator.source"
        >{{ indicator.source }}</a>
        <span v-else>{{ indicator.source }}</span>
      </div>
    </div>
    <div class="right-column">
      <message-display
        v-if="usableTimeseries.length === 0"
        :message="emptyRangeMessage"
      />
      <line-chart
        v-if="hasChartData"
        class="line-chart"
        :data="chartData"
        :marked-region="historicalRange"
      />
      <div
        v-else
        class="indicators-content-no-data">
        <p> No data available </p>
      </div>
    </div>
  </div>
</template>

<script>
import _ from 'lodash';

import LineChart from '@/components/widgets/charts/line-chart';
import MessageDisplay from '@/components/widgets/message-display';

import dateFormatter from '@/filters/date-formatter';
import { DEFAULT_COLOR } from '@/utils/colors-util';
import stringUtil from '@/utils/string-util';

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


const ALL = 'All';

const merge = (list) => {
  const dateGroup = _.groupBy(list, (d) => {
    return d.year + ':' + d.month;
  });
  const result = [];
  const values = Object.values(dateGroup);
  values.forEach(d => {
    result.push({
      timestamp: d[0].timestamp,
      year: d[0].year,
      month: d[0].month,
      value: _.sumBy(d, 'value')
    });
  });
  return _.orderBy(result, d => d.timestamp);
};

const ADMIN_LEVELS = [0, 1, 2].map(levelNumber => ({
  availableDataName: `availableAdmin${levelNumber}s`,
  selectedDataName: `selectedAdmin${levelNumber}`
}));

/**
 * Default indicator editor. Handles Delphi
 */
export default {
  name: 'IndicatorEditor',
  components: {
    LineChart,
    MessageDisplay
  },
  props: {
    // Contains metadata for the currently selected indicator
    indicator: {
      type: Object,
      default: () => ({})
    },
    // Contains the selected region at each admin level, selected unit, and function
    indicatorParameters: {
      type: Object,
      default: () => ({})
    },
    // A much larger data structure that contains timeseries for all
    //  regions at all admin levels that are supported by the currently
    //  selected indicator
    allRegionalData: {
      type: Object,
      default: () => ({})
    },
    modelSummary: {
      type: Object,
      required: true
    }
  },
  data: () => ({
    chartData: [],
    indicatorValue: 0,
    indicatorTimeseries: [],
    availableUnits: [],
    availableAdmin0s: [],
    availableAdmin1s: [],
    availableAdmin2s: [],

    selectedFunction: '',
    selectedUnit: null,
    selectedAdmin0: null,
    selectedAdmin1: null,
    selectedAdmin2: null
  }),
  computed: {
    hasAvailableUnits: function() {
      return !_.isEmpty(this.availableUnits);
    },
    hasChartData: function () {
      return !_.isEmpty(this.chartData);
    },
    emptyRangeMessage() {
      const start = dateFormatter(this.historicalRange.start, 'YYYY-MMM');
      const end = dateFormatter(this.historicalRange.end, 'YYYY-MMM');
      return `Time range ${start} to ${end} does not intersect with indicator data range. Default engine values will be used`;
    },
    historicalRange() {
      return this.modelSummary.parameter.indicator_time_series_range;
    },
    isSourceValidUrl() {
      return stringUtil.isValidUrl(this.indicator.source);
    }
  },
  watch: {
    indicator(n, o) {
      if (n === o) return;
      this.initialize();
    }
  },
  created() {
    this.usableTimeseries = [];
  },
  mounted() {
    this.initialize();
  },
  methods: {
    initialize() {
      const params = _.get(this.indicatorParameters, 'indicator_time_series_parameter', {}) || {};
      this.selectedUnit = params.unit;
      this.selectedAdmin0 = params.country;
      this.selectedAdmin1 = params.admin1;
      this.selectedAdmin2 = params.admin2;

      this.selectedFunction = _.get(this.indicatorParameters, 'initial_value_parameter.func', 'last');

      this.recalculate();
      this.refresh();
    },
    setUnit() {
      ADMIN_LEVELS.forEach(level => {
        // e.g. this.selectedAdmin1 = null;
        this[level.selectedDataName] = null;
      });
      this.recalculate();
      this.refresh();
    },
    // reset all selected admin levels after the specified index, then recalculate
    setAdminLevel(adminLevelIndex) {
      // i.e. setAdmin1 === setAdminLevel(1)
      ADMIN_LEVELS.slice(adminLevelIndex + 1).forEach(level => {
        // e.g. this.selectedAdmin2 = null;
        this[level.selectedDataName] = null;
      });
      this.recalculate();
      this.refresh();
    },
    recalculateRecursive(regions, levelIndex) {
      // Called recursively for each admin level
      if (levelIndex >= ADMIN_LEVELS.length) return;
      const adminLevel = ADMIN_LEVELS[levelIndex];
      const availableRegions = regions.map(d => d.key);

      // HACK: Sometimes there is a "" region, if it's there move it to the end of the list
      const emptyIndex = availableRegions.indexOf('');
      if (emptyIndex >= 0 && availableRegions.length > 1) {
        availableRegions.splice(emptyIndex, 1);
        availableRegions.push('');
      }

      // Append "All" option unless this is admin level 0 (country),
      // or there aren't multiple regions available
      if (levelIndex > 0 && availableRegions.length > 1) {
        availableRegions.unshift(ALL);
      }

      // this[adminLevel.availableDataName] === this.availableAdmin1s (for example)
      this[adminLevel.availableDataName] = availableRegions;

      if (levelIndex === 0) {
        // TEMP: Set Country to Ethiopia if it exists
        const index = _.findIndex(this[adminLevel.availableDataName], i => i.toLowerCase() === 'ethiopia');
        const defaultIndex = Math.max(index, 0);
        this[adminLevel.selectedDataName] = _.isNil(this[adminLevel.selectedDataName])
          ? this[adminLevel.availableDataName][defaultIndex]
          : this[adminLevel.selectedDataName];
      } else {
        const hasAll = _.indexOf(this[adminLevel.availableDataName], ALL) >= 0;
        // this[adminLevel.selectedDataName] === this.selectedAdmin1 (for example)
        this[adminLevel.selectedDataName] = this[adminLevel.selectedDataName] ||
          (hasAll ? ALL : this[adminLevel.availableDataName][0]);
      }

      if (this[adminLevel.selectedDataName] === ALL) {
        this.indicatorTimeseries = merge(_.flatten(regions.map(d => d.meta.timeseries)));
        this.updateSeries();
        return;
      }
      const nextLevel = regions.find(region => region.key === this[adminLevel.selectedDataName]);
      if (levelIndex === ADMIN_LEVELS.length - 1) {
        this.indicatorTimeseries = nextLevel.meta.timeseries;
        this.updateSeries();
      }
      this.recalculateRecursive(nextLevel.children, levelIndex + 1);
    },
    recalculate() {
      // Reset list of available regions for each admin level
      ADMIN_LEVELS.forEach(level => {
        // e.g. this.availableAdmin1s = [];
        this[level.availableDataName] = [];
      });
      // Recalculate options for units
      this.availableUnits = Object.keys(this.allRegionalData);
      this.selectedUnit = this.selectedUnit || this.availableUnits[0];

      this.recalculateRecursive(this.allRegionalData[this.selectedUnit], 0);
    },
    updateSeries() {
      const func = AGGREGATION_FUNCTIONS[this.selectedFunction];
      this.usableTimeseries = this.indicatorTimeseries.filter(d => {
        return d.timestamp >= this.historicalRange.start &&
          d.timestamp <= this.historicalRange.end;
      });

      this.indicatorValue = this.usableTimeseries.length > 0
        ? func(this.usableTimeseries.map(d => d.value))
        : 0.0;

      this.setIndicatorValue();
    },
    refresh() {
      const series = this.indicatorTimeseries.map(d => {
        return {
          timestamp: d.timestamp,
          value: d.value
        };
      });

      this.chartData = [
        {
          name: '',
          color: DEFAULT_COLOR,
          series
        }
      ];
    },

    setIndicatorValue() {
      this.$emit('parameter-change', {
        indicator_id: this.indicator.variable,
        indicator_name: this.indicator.output_name,
        indicator_source: this.indicator.model,
        indicator_score: this.indicator._search_score,
        indicator_time_series: this.indicatorTimeseries.map(d => {
          return {
            timestamp: d.timestamp,
            value: d.value
          };
        }),
        indicator_time_series_parameter: {
          unit: this.selectedUnit,
          country: this.selectedAdmin0,
          admin1: this.selectedAdmin1,
          admin2: this.selectedAdmin2
        },
        initial_value: this.indicatorValue,
        initial_value_parameter: {
          func: this.selectedFunction
        }
      });
    },
    hasSelectableAdmins(availableAdmin) {
      return availableAdmin.length > 0;
    }
  }
};
</script>

<style lang="scss" scoped>
.indicator-editor-container {
  display: flex;

  .left-column {
    width: 40%;
    max-height: 60vh;
    margin-right: 10px;
    flex-direction: column;
    overflow-y: auto;
    overflow-wrap: break-word;
  }

  .metadata-row {
    display: flex;
    align-items: center;
    margin-bottom: 5px;

    .choice-label {
      min-width: 160px;
      padding-right: 5px;
    }

    &--top-margin {
      margin-top: 25px;
    }
  }

  .right-column {
    width: 60%;
    position: relative;

    .line-chart {
      height: 30vh;
      width: 100%;
    }
  }
}
</style>
