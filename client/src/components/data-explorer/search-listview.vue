<template>
  <div class="search-listview-container h-100">

    <div class="table-fixed-head h-100">
      <table>
        <thead>
          <tr>
            <th><span class="left-cover" />VARIABLE and SOURCE</th>
            <th>DESCRIPTION</th>
            <th>PERIOD</th>
            <th>REGION</th>
            <th><!-- Timeseries chart--> <span class="right-cover" /></th>
          </tr>
        </thead>
        <tbody>
            <tr
              class="tr-item"
              v-for="d in datacubes"
              :key="d.id"
              :class="{ selected: isSelected(d), deactive: !d.isAvailable }"
              @click="updateExpandedRow(d)"
            >
              <td class="output-col">
                <div class="output-layout">
                  <!-- in case of requesting multiple selection -->
                  <div @click.stop="updateSelection(d)" class="radio">
                    <template v-if="enableMultipleSelection">
                      <i
                        class="fa fa-lg fa-fw"
                        :class="{ 'fa-check-square-o': isSelected(d), 'fa-square-o': !isSelected(d), 'disabled': isDisabled(d)}"
                      />
                    </template>
                    <template v-else>
                      <i
                        class="fa fa-lg fa-fw"
                        :class="{ 'fa-circle': isSelected(d), 'fa-circle-o': !isSelected(d) }"
                      />
                    </template>
                    <i
                      class="fa fa-lg fa-fw"
                      :class="getTypeIcon(d)"
                    />
                  </div>
                  <div class="content">
                      <button
                        v-if="isNotPublished(d)"
                        class="not-ready-label"
                      >
                        Not Published
                      </button>
                      <button
                        v-if="isProcessing(d)"
                        class="not-ready-label"
                      >
                        Processing
                      </button>
                      <div class="text-bold">{{ d.outputs[0].display_name }}</div>
                      <div>{{ d.name }}</div>
                      <div>{{ d.source }}</div>
                      <div v-if="isExpanded(d) && d.parameters?.length > 0" class="knobs">
                        Input Knobs:<br/>
                        {{ formatParameters(d) }}
                      </div>
                  </div>
                </div>
              </td>
              <td class="desc-col">
                <div>{{ formatDescription(d) }}</div>
              </td>
              <td class="period-col">
                <div class="text-bold">{{ formatPeriod(d) }}</div>
                <div> {{ formatTimeStep(d) }} </div>
              </td>
              <td class="region-col">
                <div> {{ formatCountry(d) }} </div>
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
import { DatacubeStatus } from '@/types/Enums';
import { isModel } from '../../utils/datacube-util';

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
  data() {
    return {
      expandedRowId: ''
    };
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
    isDisabled(datacube) {
      return datacube.status !== DatacubeStatus.Ready && isModel(datacube);
    },
    isProcessing(datacube) {
      return datacube.status === DatacubeStatus.Processing && isModel(datacube);
    },
    isNotPublished(datacube) {
      return datacube.status === DatacubeStatus.Registered && isModel(datacube);
    },
    isExpanded(datacube) {
      return this.expandedRowId === datacube.id;
    },
    updateExpandedRow(datacube) {
      this.expandedRowId === datacube.id ? this.expandedRowId = '' : this.expandedRowId = datacube.id;
    },
    isSelected(datacube) {
      return this.selectedDatacubes.find(sd => sd.id === datacube.id) !== undefined;
    },
    updateSelection(datacube) {
      if (!this.isDisabled(datacube)) {
        const item = { // AnalysisItem
          datacubeId: datacube.data_id,
          id: datacube.id,
          viewConfig: {}
        };
        if (this.enableMultipleSelection) {
          // if the datacube is not in the list add it, otherwise remove it
          if (this.isSelected(datacube)) {
            const newSelectedDatacubes = this.selectedDatacubes.filter(sd => sd.id !== item.id);
            this.setSelectedDatacubes(newSelectedDatacubes);
          } else {
            this.setSelectedDatacubes([...this.selectedDatacubes, item]);
          }
        } else {
          // only one selection is allowed, so replace the selected datacubes array
          this.setSelectedDatacubes([item]);
        }
      }
    },
    formatParameters({ parameters }) {
      const params = parameters || [];
      return params.map(p => p.name).join(', ');
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
    formatPeriod(d) {
      if (!d.period) {
        return '';
      }
      const min = Number(d.period.gte);
      const max = Number(d.period.lte);
      const years = [min, max].map(t => moment(t).format('YYYY'));
      return `${years[0]} - ${years[1]}`;
    },
    formatCountry(d) {
      const country = d.geography.country;
      if (!country) return '';
      return this.isExpanded(d) || country.length < 4
        ? country.join(', ')
        : `${country.slice(0, 3).join(', ')} and ${country.length - 4} more.`;
    },
    formatDescription(d) {
      if (!d.description) return '';
      return this.isExpanded(d) || d.description.length < 140
        ? d.description
        : `${d.description.substring(0, 140)}...`;
    },
    getTypeIcon(d) {
      return 'fa ' + (d.type === 'model' ? 'fa-connectdevelop' : 'fa-table');
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
  width: 100%;
  table  {
    border-collapse: collapse;
    width: 100%;
    vertical-align: top;
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
    vertical-align: top;
  }
  tr th {
    font-size: $font-size-small;
    font-weight: normal;
  }
  .table-fixed-head {
    overflow-y: auto;
    overflow-x: hidden;
    height: 100%;
    width: 100%;
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
    height: 50px;
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
    width: 33%;
    .output-layout {
      display: flex;
      align-content: stretch;
      align-items: stretch;
      .radio {
        flex: 0 0 auto;
        align-self: flex-start;
        margin: 15px 10px 0 0;
        .disabled {
          color: $background-light-3;
        }
      }
      .content {
        flex: 1 1 auto;
        .not-ready-label {
          font-weight: 600;
          border: none;
          border-radius: 5px;
          background-color: $background-light-3;
          margin-top: 5px;
        }
        .knobs {
          margin-top: 10px;
        }
      }
    }
  }
  .region-col {
    width: 200px;
  }
  .period-col {
    width: 120px;
  }
  // time series hidden until actually put into use
  .timeseries-col {
    padding-left: 5px;
    padding-right: 10px;
    display: none;
  }
  .timeseries-container {
    background-color: #f1f1f1;
    width: 110px;
    height: 50px;
    display: none;
  }
}
</style>
