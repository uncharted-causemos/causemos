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
              <div class="timeseries-container" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>

import _ from 'lodash';
import moment from 'moment';
import { mapActions, mapGetters } from 'vuex';
import filtersUtil from '@/utils/filters-util';
import { getDatacubes } from '@/services/datacube-service';

// HACK: Whitelist models that we can display its output.
const availableModelsOld = [
  'PIHM',
  'G-Range',
  'consumption_model',
  'cropland_model',
  'population_model',
  'asset_wealth_model',
  'malnutrition_model',

  'APSIM',
  'DSSAT',
  'lpjml',
  'lpjml_historic',
  'market_price_model',
  'flood_index_model',

  'world_population_africa'

  // ==== No runs/input parameters found for theses ====
  // 'agmip',
  // 'chirps',

  // === we don't have datacube metadata for this ===
  // 'yeild_anomalies_lpjml'
];

// There are the models we have processed output tiles for
const availableModelsNew = [
  // SuperMaas models
  '01115b70-c119-4853-941d-69070ca9a2ab',
  '2825e6eb-b715-4ba1-8a64-d105d48519c2',
  '2c945fc2-cf50-4dc0-95aa-a7bcc89822bd',
  '2fe40c11-8862-4ab4-b528-c85dacdc615e',
  '337337ab-ef63-4231-b1e8-770a079857fa',
  '43dfec98-d6b5-403d-a138-683aa1da0ccb',
  '6248023f-ffe0-49ee-aad9-83cc7a4d5fa5',
  '713f37d5-a101-4e4c-af06-b0d8c3455f5a',
  '8622a51f-d4ab-4968-8394-3be4250c52f4',
  '8e14a356-8be1-4a36-8cb4-69293e9375b0',
  '93cba07b-72b3-45e4-854a-fd748e88cd24',
  'a51eb181-7140-4f7b-bd6d-a8c47c256f12',
  'c35d50df-6d26-4c23-bf5e-fdef7b07de13',
  'c4c5b067-47b1-4592-82e8-7ba90037c3c8',
  'c7ec06e0-a8cc-43f4-84df-3158dd2b3652',
  'd594fd1a-f10d-4a36-9e41-8708c30e3765',
  'da78c5d7-b31a-438d-ac19-1ffa41458be7',
  'dcaf34bb-469e-41ab-ad11-9d94211305dc',
  'e4a68875-6405-4e57-979e-f453155b9c9a',
  // atlas models
  '32434828-b469-41bd-8467-c67ab0d3ebf1',
  '57d1ae38-4874-4ee2-95ed-28aa8e3bc6be',
  'd50dcd3c-88df-4875-b2df-cef09d578345',
  'ed11c3dd-f3aa-4464-8c15-7759e95237c7',

  // New models from new cubes ( CHIRPS rainfall relative to average, and gadm?)
  '598f80ae-70a8-43ec-90a8-ee3504f60109',
  '4eae97ee-4758-4ae1-848f-b423351f51c3',

  // lpjml
  'e0a14dbf-e8e6-42bd-b908-e72a956fadd5',
  // lpjml new version
  '3fd5794e-f7d3-4fcf-922b-652c93853caa'
];

const MAX_SELECTION = 6;
export default {
  name: 'SearchListview',
  components: {
  },
  data: () => ({
    datacubes: []
  }),
  computed: {
    ...mapGetters({
      selectedDatacubes: 'dataSearch/selectedDatacubes',
      filters: 'dataSearch/filters'
    })
  },
  watch: {
    filters(n, o) {
      if (filtersUtil.isEqual(n, o)) return;
      this.refresh();
    }
  },
  mounted() {
    this.refresh();
  },
  methods: {
    ...mapActions({
      enableOverlay: 'app/enableOverlay',
      disableOverlay: 'app/disableOverlay',
      setSearchResultsCount: 'dataSearch/setSearchResultsCount',
      setSelectedDatacubes: 'dataSearch/setSelectedDatacubes'
    }),
    async refresh() {
      await this.fetchDatacubes();
    },
    async fetchDatacubes() {
      this.enableOverlay();
      const filterOldModel = _.cloneDeep(this.filters);
      filtersUtil.setClause(filterOldModel, 'type', ['model'], 'or', false);
      filtersUtil.setClause(filterOldModel, 'model', availableModelsOld, 'or', false);
      const filterNewModel = _.cloneDeep(this.filters);
      filtersUtil.setClause(filterNewModel, 'type', ['model'], 'or', false);
      filtersUtil.setClause(filterNewModel, 'model_id', availableModelsNew, 'or', false);
      const [oldCubes, newCubes] = await Promise.all([getDatacubes(filterOldModel), getDatacubes(filterNewModel)]);
      this.datacubes = _.unionBy([...oldCubes, ...newCubes], cube => cube.id);
      this.datacubes.forEach(item => (item.isAvailable = true));
      this.setSearchResultsCount(this.datacubes.length);
      this.disableOverlay();
    },
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
@import "~styles/wm-theme/wm-theme";
$selected-border: #255DCC;
$selected-background: #EBF1FC;
.search-listview-container {
  background: $color-background-lvl-1;
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
      background: $color-background-lvl-1;
      border: none;
    }
  }
  td {
    background: $background-light-1;
  }
  tr th {
    font-size: 12px;
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
    font-size: 16px;
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
