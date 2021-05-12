<template>
  <div class="search-listview-container h-100">

    <div class="table-fixed-head h-100">
      <table>
        <thead>
          <tr>
            <th> <span class="left-cover" /> OUTPUT VARIABLE</th>
            <th>INPUT KNOBS</th>
            <th>REGION</th>
            <th>PERIOD</th>
            <th><!-- Timeseries chart--> <span class="right-cover" /></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="d in datacubes"
            :key="d.id"
            class="tr-item"
            :class="{ selected: isSelected(d), deactive: !d.isAvailable }"
            @click="toggleSelection(d)">
            <td class="output-col">
              <i
                class="fa fa-lg fa-fw checkbox"
                :class="{ 'fa-check-square-o': isSelected(d), 'fa-square-o': !isSelected(d) }"
              />
              <div class="text-bold">{{ formatOutputVariables(d) }}</div>
              <div>{{ d.source }}</div>
            </td>
            <td class="param-col">
              <div> {{ formatParameters(d) }} </div>
            </td>
            <td class="region-col">
              <div class="text-bold">{{ formatRegion(d) }}</div>
              <div> {{ formatAdminLevels(d) }} </div>
            </td>
            <td class="period-col">
              <div class="text-bold">{{ formatPeriod(d) }}</div>
              <div> {{ formatTimeStep(d) }} </div>
            </td>
            <td class="timeseries-col">
              <div class="timeseries-container">
                <sparkline :data="formatTimeSeries(d)" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>

import moment from 'moment';
import { mapActions, mapGetters } from 'vuex';
import Sparkline from '@/components/widgets/charts/sparkline';

const MAX_SELECTION = 6;
export default {
  name: 'SearchListview',
  components: {
    Sparkline
  },
  props: {
    datacubes: {
      type: Array,
      default: () => []
    }
  },
  computed: {
    ...mapGetters({
      selectedDatacubes: 'dataSearch/selectedDatacubes',
      filters: 'dataSearch/filters'
    })
  },
  methods: {
    ...mapActions({
      setSelectedDatacubes: 'dataSearch/setSelectedDatacubes'
    }),

    isSelected(datacube) {
      return this.selectedDatacubes.find(dId => dId === datacube.id) !== undefined;
    },
    toggleSelection(datacube) {
      const canBeAdded = this.selectedDatacubes.length < MAX_SELECTION;
      const selected = this.isSelected(datacube)
        ? this.selectedDatacubes.filter(dId => dId !== datacube.id) // Remove already selected one
        : canBeAdded ? [...this.selectedDatacubes, datacube.id] : this.selectedDatacubes; // Add if the limit hasn't been reached
      this.setSelectedDatacubes(selected);
    },
    formatOutputVariables(datacube) {
      // Replace _ with space and capitalize the first letters. eg. cropland_model -> Cropland Model
      const modelName = datacube.model.split('_').map(s => (s.charAt(0).toUpperCase() + s.slice(1))).join(' ');
      const outputName = datacube.output_name.replace(/_/g, ' ');
      return `${modelName}/${outputName}`;
    },
    formatParameters({ parameters }) {
      const params = parameters || [];
      return params.map(p => p.replace(/_/g, ' ')).join(', ');
    },
    formatRegion({ country = [] }) {
      return (country && country.length) ? country[0] : '';
    },
    formatAdminLevels() {
      return 'Admin L1 - L2';
    },
    formatTimeStep() {
      return 'monthly';
    },
    formatTimeSeries(cubeRow) {
      const sparklineData = [{ series: [] }];
      if (cubeRow.timeseries) {
        sparklineData[0].series = cubeRow.timeseries;
      } else {
        // empty case
        sparklineData[0].series = [0];
      }
      return sparklineData;
    },
    formatPeriod({ period = [] }) {
      // Grab min and max date from the list of date ranges and format in start year - end year form.
      if (!period || period.length === 0) {
        return '';
      }
      let min = Number(period[0].gte);
      let max = Number(period[0].lte);
      period.forEach(t => {
        min = t.gte < min ? t.gte : min;
        max = t.lte > max ? t.lte : max;
      });
      const years = [min, max].map(t => moment(t).format('YYYY'));
      return period.length ? `${years[0]} - ${years[1]}` : '';
    }
  }
};
</script>

<style lang='scss' scoped>
@import "~styles/variables";
$selected-border: #255DCC;
$selected-background: #EBF1FC;
.search-listview-container {
  background: $background-light-2;
  padding: 0 10px;
  table  {
    border-collapse: collapse;
    width: 100%;
  }
  th, td {
    padding: 8px 16px;
  }
  tr {
    border: 2px solid $separator;
    cursor: pointer;
  }
  thead {
    tr {
      border: none;
    }

    th {
      border: none;
    }
  }
  td {
    background: $background-light-1;
  }
  tr th {
    font-size: $font-size-small;
    font-weight: normal;
  }
  .table-fixed-head {
    overflow-y: auto;
    height: 100%;
  }
  .table-fixed-head thead th {
    position: sticky;
    top: -1px;
    z-index: 1;
  }
  .left-cover, .right-cover {
    // Cover left and right gap in the fixed table header
    position: absolute;
    height: 100%;
    width: 2px;
    left: -2px;
    background: $background-light-2;
    top: 0;
  }
  .right-cover {
    left: unset;
    right: -2px;
  }

  .tr-item {
    height: 74px;
  }
  .tr-item.selected {
    border: 2px double $selected-border;
    .output-col {
      border-left: 4px solid $selected-border;
    }
    td {
      background-color: $selected-background
    }
  }
  .tr-item.deactive {
    opacity: 0.5;
    pointer-events: none;
  }
  .text-bold {
    font-size: $font-size-large;
    font-weight: 600;
    margin-bottom: 5px;
    white-space: nowrap;
  }
  .output-col {
    padding-left: 50px;
    .checkbox {
      margin: 0;
      top: 19px;
      left: -35px;
    }
  }
  .region-col {
    width: 120px;
  }
  .timeseries-col {
    padding-left: 5px;
    padding-right: 10px;
  }
  .timeseries-container {
    background-color: #f1f1f1;
    width: 110px;
    height: 50px;
  }
}
</style>
