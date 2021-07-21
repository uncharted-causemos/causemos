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
            @click="updateSelection(d)">
            <td class="output-col">
              <!-- in case of requesting multiple selection -->
              <template v-if="enableMultipleSelection">
                <i
                  class="fa fa-lg fa-fw radio"
                  :class="{ 'fa-check-square-o': isSelected(d), 'fa-square-o': !isSelected(d) }"
                />
                <div>
                  <div class="text-bold">{{ d.outputs[0].display_name }}</div>
                  <div>{{ d.name }}</div>
                </div>
              </template>
              <template v-else>
                <i
                  class="fa fa-lg fa-fw radio"
                  :class="{ 'fa-circle': isSelected(d), 'fa-circle-o': !isSelected(d) }"
                />
                <div>
                  <div class="text-bold">{{ d.outputs[0].display_name }}</div>
                  <div>{{ d.name }}</div>
                </div>
              </template>
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

export default {
  name: 'SearchListview',
  components: {
    Sparkline
  },
  props: {
    datacubes: {
      type: Array,
      default: () => []
    },
    enableMultipleSelection: {
      type: Boolean,
      default: false
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
      return this.selectedDatacubes.find(sd => sd.id === datacube.id) !== undefined;
    },
    updateSelection(datacube) {
      const item = {
        dataId: datacube.data_id,
        feature: datacube.default_feature,
        id: datacube.id
      };
      if (this.enableMultipleSelection) {
        // if the datacube is not in the list add it, otherwise remove it
        if (this.isSelected(datacube)) {
          const newSelectedDatacubes = this.selectedDatacubes.filter(sd => sd.id !== item.id);
          this.setSelectedDatacubes(newSelectedDatacubes);
        } else {
          this.setSelectedDatacubes([...this.selectedDatacubes, item]);
        }
        console.log(this.selectedDatacubes);
      } else {
        // only one selection is alloed, so replace the selected datacubes array
        this.setSelectedDatacubes([item]);
      }
    },
    formatParameters({ parameters }) {
      const params = parameters || [];
      return params.map(p => p.name).join(', ');
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
      if (!period) {
        return '';
      }
      const min = Number(period.gte);
      const max = Number(period.lte);
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
    overflow-x: hidden;
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
  }
  .output-col {
    padding-left: 50px;
    width: 33%;
    .radio {
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
