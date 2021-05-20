<template>
  <div class="indicator-editor-container">
    <div class="left-column">
      <div v-if="indicator !== null">
        <h6>{{ indicator.output_name }}</h6>
        <span v-if="indicator.output_description !== undefined">{{ indicator.output_description }}</span>
      </div>
      <!-- Unit -->
      <indicator-metadata-row
        v-model="selectedUnit"
        class="metadata-row--top-margin"
        :row-label="'Units'"
        :options="availableUnits"
      />
      <indicator-metadata-row
        v-model="selectedCountry"
        :row-label="'Country'"
        :options="availableCountries"
      />
      <indicator-metadata-row
        v-model="selectedAdmin1"
        :row-label="'Admin L1'"
        :options="availableAdmin1s"
      />
      <indicator-metadata-row
        v-model="selectedAdmin2"
        :row-label="'Admin L2'"
        :options="availableAdmin2s"
      />
      <indicator-metadata-row
        v-model="indicatorModel"
        class="metadata-row--top-margin"
        :row-label="'Dataset/Model'"
        :options="[indicator.model]"
      />
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
          target="_blank"
          rel="noopener noreferrer"
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

import dateFormatter from '@/formatters/date-formatter';
import { DEFAULT_COLOR } from '@/utils/colors-util';
import stringUtil from '@/utils/string-util';
import aggregationsUtil from '@/utils/aggregations-util';
import { fetchIndicator } from '@/services/indicator-service';
import IndicatorMetadataRow from './indicator-metadata-row.vue';

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

function prependAllOption(optionsList) {
  if (optionsList.length < 2) return optionsList;
  return [ALL, ...optionsList];
}

function sumByTimestamp(dataPoints) {
  const groupedByDate = _.groupBy(dataPoints, (d) => d.timestamp);
  const summedByDate = Object.values(groupedByDate).map(points => {
    const { timestamp } = points[0];
    return {
      timestamp,
      value: _.sumBy(points, 'value')
    };
  });
  return _.sortBy(summedByDate, date => date.timestamp);
}

/**
 * Default indicator editor. Handles Delphi
 */
export default {
  name: 'IndicatorEditor',
  components: {
    LineChart,
    MessageDisplay,
    IndicatorMetadataRow
  },
  props: {
    // Contains metadata for the currently selected indicator
    indicator: {
      type: Object,
      required: true
    },
    // Contains the selected region at each admin level, selected unit, and function
    initialIndicatorParameters: {
      type: Object,
      default: () => ({})
    },
    modelSummary: {
      type: Object,
      required: true
    }
  },
  emits: ['parameter-change'],
  data: () => ({
    selectedUnit: null,
    selectedCountry: null,
    selectedAdmin1: null,
    selectedAdmin2: null,
    // A large data structure that contains timeseries for all
    //  regions at all admin levels that are supported by the currently
    //  selected indicator
    allRegionalData: null
  }),
  computed: {
    chartData: function() {
      const series = this.timeseries.map(d => ({
        timestamp: d.timestamp,
        value: d.value
      }));
      if (series.length === 0) return [];
      return [
        {
          name: '',
          color: DEFAULT_COLOR,
          series
        }
      ];
    },
    hasChartData: function() {
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
    },
    availableUnits() {
      if (this.allRegionalData === null) return [];
      return Object.keys(this.allRegionalData);
    },
    availableCountries() {
      if (this.allRegionalData === null) return [];
      const selectedUnit = this.allRegionalData[this.selectedUnit];
      if (selectedUnit === undefined) return [];
      const countries = Object.keys(selectedUnit);
      // HACK: Sometimes there is a "" region, if it's there move it to the end of the list
      const containsEmptyString = countries.includes('');
      if (containsEmptyString) {
        return [...countries.filter(country => country !== ''), ''];
      }
      return countries;
    },
    availableAdmin1s() {
      if (this.allRegionalData === null) return [];
      const selectedCountry = _.get(
        this.allRegionalData,
        [this.selectedUnit, this.selectedCountry],
        []
      );
      const admin1s = Object.keys(selectedCountry);
      // Append an 'ALL' option if there is more than one region
      return prependAllOption(admin1s);
    },
    availableAdmin2s() {
      if (this.allRegionalData === null || this.selectedAdmin1 === ALL) return [];
      const selectedAdmin1 = _.get(
        this.allRegionalData,
        [this.selectedUnit, this.selectedCountry, this.selectedAdmin1],
        []
      );
      const admin2s = Object.keys(selectedAdmin1);
      // Append an 'ALL' option if there is more than one region
      return prependAllOption(admin2s);
    },
    timeseries() {
      if (this.allRegionalData === null) return [];
      const countries = this.allRegionalData[this.selectedUnit];
      const selectedCountry = countries[this.selectedCountry];
      if (selectedCountry === undefined) return [];
      if (this.selectedAdmin1 === ALL) {
        const allAdmin2sByAdmin1 = Object.values(selectedCountry).map(admin1 => Object.values(admin1));
        const allAdmin2s = _.flatten(allAdmin2sByAdmin1);
        const flattenedAdmin2Series = _.flatten(allAdmin2s);
        return sumByTimestamp(flattenedAdmin2Series);
      }
      const selectedAdmin1 = selectedCountry[this.selectedAdmin1];
      if (selectedAdmin1 === undefined) return [];
      if (this.selectedAdmin2 === ALL) {
        const allAdmin2s = Object.values[selectedAdmin1];
        const flattenedAdmin2Series = _.flatten(allAdmin2s);
        return sumByTimestamp(flattenedAdmin2Series);
      }
      const selectedAdmin2 = selectedAdmin1[this.selectedAdmin2];
      if (selectedAdmin2 === undefined) return [];
      const cleanedData = selectedAdmin2.map(dataPoint => {
        const { timestamp, value } = dataPoint;
        return { timestamp, value };
      });
      return _.sortBy(cleanedData, dataPoint => dataPoint.timestamp);
    },
    usableTimeseries() {
      return this.timeseries.filter(d => {
        return d.timestamp >= this.historicalRange.start &&
          d.timestamp <= this.historicalRange.end;
      });
    },
    aggregatedTimeseriesValue() {
      const selectedFunction = _.get(this.initialIndicatorParameters, 'initial_value_parameter.func', 'last');
      const func = AGGREGATION_FUNCTIONS[selectedFunction];
      return this.usableTimeseries.length > 0
        ? func(this.usableTimeseries.map(d => d.value))
        : 0.0;
    },
    indicatorModel() {
      return this.indicator ? this.indicator.model : null;
    }
  },
  watch: {
    indicator: {
      handler: function () {
        this.fetchAllRegionalData();
      },
      immediate: true
    },
    availableUnits(units) {
      // If no unit is selected, or the selected unit isn't an option,
      //  select the first one
      if (_.isNil(this.selectedUnit) || !units.includes(this.selectedUnit)) {
        this.selectedUnit = units[0];
      }
    },
    availableCountries(countries) {
      // If no country is selected, or the selected country isn't an option,
      // HACK: Added for a demo, set country to Ethiopia if it exists
      // Otherwise, default to first option
      if (_.isNil(this.selectedCountry) || !countries.includes(this.selectedCountry)) {
        this.selectedCountry = countries.includes('Ethiopia')
          ? 'Ethiopia'
          : countries[0];
      }
    },
    availableAdmin1s(admin1s) {
      // If no admin1 is selected, or the selected admin1 isn't an option,
      //  default to the first option
      if (_.isNil(this.selectedAdmin1) || !admin1s.includes(this.selectedAdmin1)) {
        this.selectedAdmin1 = admin1s[0];
      }
    },
    availableAdmin2s(admin2s) {
      // If no admin2 is selected, or the selected admin2 isn't an option,
      //  default to the first option
      if (_.isNil(this.selectedAdmin2) || !admin2s.includes(this.selectedAdmin2)) {
        this.selectedAdmin2 = admin2s[0];
      }
    },
    // FIXME: with Vue 3 we can consolidate all of these into
    //  one watcher targetting multiple properties
    timeseries() {
      this.emitParameterChange();
    },
    selectedUnit() {
      this.emitParameterChange();
    },
    selectedCountry() {
      this.emitParameterChange();
    },
    selectedAdmin1() {
      this.emitParameterChange();
    },
    selectedAdmin2() {
      this.emitParameterChange();
    },
    aggregatedTimeseriesValue() {
      this.emitParameterChange();
    }
  },
  mounted() {
    this.storeInitialIndicatorParameters();
  },
  methods: {
    storeInitialIndicatorParameters() {
      const { unit, country, admin1, admin2 } = _.get(
        this.initialIndicatorParameters,
        'indicator_time_series_parameter',
        {}
      );
      this.selectedUnit = unit;
      this.selectedCountry = country;
      this.selectedAdmin1 = admin1;
      this.selectedAdmin2 = admin2;
    },
    async fetchAllRegionalData() {
      this.allRegionalData = null;
      const { variable, model, output_units: unit } = this.indicator;
      const result = await fetchIndicator(variable, model, unit);
      const data = result.data;
      let groupedResult = {};
      if (!_.isNil(unit)) {
        groupedResult[unit] = data;
      } else {
        groupedResult = _.groupBy(data, dataPoint => dataPoint.value_unit);
      }
      const pipeline = [
        (dataPoint) => dataPoint.country,
        (dataPoint) => dataPoint.admin1,
        (dataPoint) => dataPoint.admin2
      ];
      Object.keys(groupedResult).forEach(unit => {
        const groupedByUnit = groupedResult[unit];
        groupedResult[unit] = aggregationsUtil.groupRepeatedly(groupedByUnit, pipeline);
      });
      this.allRegionalData = groupedResult;
    },
    emitParameterChange() {
      const timeseries = this.timeseries.map(dataPoint => {
        const { timestamp, value } = dataPoint;
        return { timestamp, value };
      });
      this.$emit(
        'parameter-change',
        this.selectedUnit,
        this.selectedCountry,
        this.selectedAdmin1,
        this.selectedAdmin2,
        timeseries,
        this.aggregatedTimeseriesValue
      );
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
