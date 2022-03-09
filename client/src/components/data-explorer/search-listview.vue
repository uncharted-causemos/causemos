<template>
  <div class="search-listview-container h-100">

    <div class="table-fixed-head h-100">
      <table>
        <thead>
          <tr>
            <th><span class="left-cover" />VARIABLE INFORMATION</th>
            <th>SOURCE and DESCRIPTION</th>
            <th>PERIOD</th>
            <th>REGION</th>
            <th>PREVIEW<span class="right-cover" /></th>
          </tr>
        </thead>
        <tbody>
            <tr
              class="tr-item"
              v-for="d in datacubes"
              :key="d.id"
              :class="{ selected: isSelected(d) }"
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
                        v-if="isDeprecated(d)"
                        class="not-ready-label"
                      >
                        Deprecated
                      </button>
                      <button
                        v-if="isProcessing(d)"
                        class="not-ready-label"
                      >
                        Processing
                      </button>
                      <div class="text-bold">{{ formatOutputName(d) }}</div>
                      <multiline-description :text="formatOutputDescription(d)" />
                      <div v-if="isExpanded(d) && d.parameters?.length > 0" class="knobs">
                        Input Knobs:<br/>
                        {{ formatParameters(d) }}
                      </div>
                  </div>
                </div>
              </td>
              <td class="desc-col">
                <div class="text-bold">{{ d.name }}</div>
                <multiline-description :text="formatDescription(d)" />
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

<script lang="ts">

import moment from 'moment';
import { defineComponent, ref, computed } from 'vue';
import { useStore } from 'vuex';
import Sparkline from '@/components/widgets/charts/sparkline.vue';
import MultilineDescription from '@/components/widgets/multiline-description.vue';
import { DatacubeStatus, TemporalResolution } from '@/types/Enums';
import { isIndicator, isModel } from '../../utils/datacube-util';
import { Datacube, ModelParameter } from '@/types/Datacube';


export default defineComponent({
  name: 'SearchListview',
  components: {
    Sparkline,
    MultilineDescription
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
  setup() {
    const store = useStore();
    const expandedRowId = ref('');
    const selectedDatacubes = computed<Datacube[]>(() => {
      return store.getters['dataSearch/selectedDatacubes'];
    });
    const setSelectedDatacubes = (items: Datacube[]) => {
      store.dispatch('dataSearch/setSelectedDatacubes', items);
    };

    return {
      expandedRowId,

      selectedDatacubes,
      setSelectedDatacubes
    };
  },
  methods: {
    isDisabled(datacube: Datacube) {
      return datacube.status === DatacubeStatus.Deprecated || (isModel(datacube) && datacube.status !== DatacubeStatus.Ready);
    },
    isProcessing(datacube: Datacube) {
      return datacube.status === DatacubeStatus.Processing && isIndicator(datacube);
    },
    isNotPublished(datacube: Datacube) {
      return datacube.status === DatacubeStatus.Registered && isModel(datacube);
    },
    isDeprecated(datacube: Datacube) {
      return datacube.status === DatacubeStatus.Deprecated;
    },
    isExpanded(datacube: Datacube) {
      return this.expandedRowId === datacube.id;
    },
    updateExpandedRow(datacube: Datacube) {
      this.expandedRowId === datacube.id ? this.expandedRowId = '' : this.expandedRowId = datacube.id;
    },
    isSelected(datacube: Datacube) {
      return this.selectedDatacubes.find(sd => sd.id === datacube.id) !== undefined;
    },
    updateSelection(datacube: Datacube) {
      if (!this.isDisabled(datacube)) {
        // FIXME: item is not Datacube type
        const item = { // AnalysisItem
          datacubeId: datacube.data_id,
          id: datacube.id,
          viewConfig: {},
          name: datacube.name // set initial name
        };
        if (this.enableMultipleSelection) {
          // if the datacube is not in the list add it, otherwise remove it
          if (this.isSelected(datacube)) {
            const newSelectedDatacubes = this.selectedDatacubes.filter(sd => sd.id !== item.id);
            this.setSelectedDatacubes(newSelectedDatacubes);
          } else {
            this.setSelectedDatacubes([item as any, ...this.selectedDatacubes]);
          }
        } else {
          // only one selection is allowed, so replace the selected datacubes array
          this.setSelectedDatacubes([item as any]);
        }
      }
    },
    formatOutputName(d: Datacube) {
      return this.getDefaultOutput(d)?.display_name ?? d.default_feature;
    },
    formatParameters({ parameters } : { parameters: ModelParameter[] }) {
      const params = parameters || [];
      return params.map(p => p.name).join(', ');
    },
    formatTimeStep(d: Datacube) {
      const originalResolution = this.getDefaultOutput(d)?.data_resolution?.temporal_resolution;
      // We want to display the aggregated resolution rather than the original one.
      return originalResolution === TemporalResolution.Annual ? 'annual' : 'monthly';
    },
    formatTimeSeries(d: Datacube) {
      return [{
        name: 'datacube',
        color: '',
        series: d.sparkline || []
      }];
    },
    formatPeriod(d: Datacube) {
      if (!d.period) {
        return '';
      }
      const min = Number(d.period.gte);
      const max = Number(d.period.lte);
      const period = [min, max].map(t => moment(t).format('MMM YYYY'));
      return min === max ? period[0] : `${period[0]} - ${period[1]}`;
    },
    formatCountry(d: Datacube) {
      const country = d.geography.country;
      if (!country) return '';
      return this.isExpanded(d) || country.length < 4
        ? country.join(', ')
        : `${country.slice(0, 3).join(', ')} and ${country.length - 4} more.`;
    },
    formatDescription(d: Datacube) {
      if (!d.description) return '';
      return this.isExpanded(d) || d.description.length < 140
        ? d.description
        : `${d.description.substring(0, 140)}...`;
    },
    formatOutputDescription(d: Datacube) {
      const defaultOutputDescription = this.getDefaultOutput(d)?.description ?? '';
      return this.isExpanded(d) || defaultOutputDescription.length < 100
        ? defaultOutputDescription
        : `${defaultOutputDescription.substring(0, 100)}...`;
    },
    getDefaultOutput(d: Datacube) {
      return d.outputs.find(output => output.name === d.default_feature);
    },
    getTypeIcon(d: Datacube) {
      return 'fa ' + (d.type === 'model' ? 'fa-connectdevelop' : 'fa-table');
    }
  }
});
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
      background-color: $selected-background;
    }
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
        margin: 3px 5px 0 0;
        .disabled {
          color: $background-light-3;
        }
      }
      .content {
        flex: 1 1 auto;
        overflow-wrap: anywhere;
        .not-ready-label {
          font-weight: 600;
          border: none;
          border-radius: 5px;
          background-color: $background-light-3;
        }
        .knobs {
          margin-top: 10px;
        }
      }
    }
  }
  .desc-col {
    width: 33%;
    overflow-wrap: anywhere;
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
  }
  .timeseries-container {
    background-color: #f1f1f1;
    width: 110px;
    height: 50px;
  }
}
</style>
