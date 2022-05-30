<template>
  <modal>
    <template #header>
      <h4 class="title"><i class="fa fa-fw fa-book" />Region selection ({{aggregationLevelTitle}})</h4>
    </template>
    <template #body>
      <div class="geo-container">
        <div v-if="modelParam.type === DatacubeGenericAttributeVariableType.Geo">
          <h5>Selected geo level: <span style="font-weight: bold">{{ aggregationLevelTitle }}</span></h5>
          <div v-if="aggregationLevelCount > 1" class="aggregation-level-range-container">
            <input
              type="range"
              class="aggregation-level-range"
              :value="aggregationLevel"
              :min="0"
              :max="aggregationLevelCount - 1"
              @input="onRangeValueChanged"
            />
            <div
              v-for="tickIndex in aggregationLevelCount"
              :key="tickIndex"
              class="aggregation-level-tick"
              :class="{ hidden: tickIndex - 1 === aggregationLevel }"
              :style="tickStyle(tickIndex)"
              @click="changeAggregationLevel(tickIndex - 1)"
            />
          </div>
        </div>
        <div class="flex-aligned">
          <span>Search: </span>
          <auto-complete
            :focus-input="true"
            :style-results="true"
            :placeholder-color="'gray'"
            :placeholder-message="'Type region name...'"
            :search-fn="searchRegions"
            @item-selected="addSelectedRegion"
          />
        </div>
        <div class="flex-aligned" style="margin-bottom: 5px">
          <label class="selected-region">Selected Region(s):</label>
          <div
            v-for="region in selectedRegions"
            :key="region.path"
            class="flex-aligned">
              {{region.label}} <i class="fa fa-fw fa-close delete-region" @click.stop="removeSelectedRegion(region.label)" />
          </div>
        </div>
        <geo-selection-map
          class="card-map"
          :selected-layer-id="selectedLayer"
          :selected-region="selectedRegionForMap"
          :bbox="selectedRegionBBox"
          :map-bounds="mapBounds"
        />
      </div>

    </template>
    <template #footer>
      <ul class="unstyled-list">
        <button
          type="button"
          class="btn first-button"
          @click.stop="close()">
            Cancel
        </button>
        <button
          type="button"
          class="btn btn-primary btn-call-for-action"
          :class="{ 'disabled': selectedRegions.length === 0}"
          @click.stop="saveSelectedRegions()">
            Save
        </button>
      </ul>
    </template>
  </modal>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import Modal from '@/components/modals/modal.vue';
import AutoComplete from '@/components/widgets/autocomplete/autocomplete.vue';
import { Model, ModelParameter } from '@/types/Datacube';
import GeoSelectionMap from '@/components/data/geo-selection-map.vue';
import { BASE_LAYER, computeMapBoundsForCountries } from '@/utils/map-util-new';
import { getGADMSuggestions } from '@/services/suggestion-service';
import { DatacubeGeoAttributeVariableType, DatacubeGenericAttributeVariableType } from '@/types/Enums';
import { GeoRegionDetail, RegionalGADMDetail } from '@/types/Common';
import { REGION_ID_DISPLAY_DELIMETER, REGION_ID_DELIMETER, stringToAdminLevel } from '@/utils/admin-level-util';
import { ETHIOPIA_BOUNDING_BOX } from '@/utils/map-util';

export default defineComponent({
  name: 'ModalGeoSelection',
  components: {
    Modal,
    AutoComplete,
    GeoSelectionMap
  },
  emits: [
    'close'
  ],
  props: {
    modelParam: {
      type: Object as PropType<ModelParameter>,
      default: null
    },
    metadata: {
      type: Object as PropType<Model>,
      default: null
    }
  },
  computed: {
    // numeric reflecting which geo parameter we are focusing on,
    //  e.g., 0 for country, 1 for admin1 and so on
    //  assume layer at country level if invalid model param is given
    selectedLayer(): number {
      if (this.modelParam === null) {
        return 0;
      }
      if (this.modelParam.type === DatacubeGenericAttributeVariableType.Geo) {
        return this.aggregationLevel;
      } else {
        return stringToAdminLevel(this.modelParam.type as string);
      }
    },
    aggregationLevelCount(): number {
      return this.acceptableGeoLevels.length;
    },
    aggregationLevelTitle(): string {
      return this.modelParam.type === DatacubeGenericAttributeVariableType.Geo && this.aggregationLevelCount > 0 ? this.acceptableGeoLevels[this.aggregationLevel] : this.modelParam.type;
    },
    acceptableGeoLevels(): string[] {
      if (this.modelParam === null || this.modelParam.type !== DatacubeGenericAttributeVariableType.Geo) {
        return [];
      }
      // now this is a geo param, so we should expect valid geo_acceptable_levels
      // if no geo_acceptable_levels are provided, revert to allowing all geo levels
      const allGeoLevels = Object.values(DatacubeGeoAttributeVariableType);
      if (this.modelParam.additional_options.geo_acceptable_levels === undefined) {
        return allGeoLevels;
      }
      // note that the geo_acceptable_levels could have entries missing or out of order
      //  (e.g., ['admin1', 'admin2'] or ['admin1', 'country'])
      const acceptableOrderedLevels: string[] = [];
      allGeoLevels.forEach(level => {
        acceptableOrderedLevels.push(this.modelParam.additional_options.geo_acceptable_levels?.includes(level) ? level : '');
      });
      return acceptableOrderedLevels;
    },
    selectedRegionForMap(): string {
      return this.selectedRegions.length > 0 ? this.selectedRegions[0].path : '';
    },
    selectedRegionBBox(): number[] {
      return this.selectedRegions.length > 0 && this.selectedRegions[0].bbox ? this.selectedRegions[0].bbox : [];
    }
  },
  data: () => ({
    selectedRegions: [] as Array<GeoRegionDetail>,
    aggregationLevel: 0,
    BASE_LAYER,
    DatacubeGenericAttributeVariableType,
    allRegions: {} as {[key: string]: GeoRegionDetail},
    mapBounds: [
      [ETHIOPIA_BOUNDING_BOX.LEFT, ETHIOPIA_BOUNDING_BOX.BOTTOM],
      [ETHIOPIA_BOUNDING_BOX.RIGHT, ETHIOPIA_BOUNDING_BOX.TOP]
    ]
  }),
  async mounted() {
    // validate initial aggregationLevel
    while (this.acceptableGeoLevels[this.aggregationLevel] === '') {
      this.aggregationLevel++;
    }

    //
    // calculate the initial map bounds covering the model geography
    //
    if (this.metadata.geography && this.metadata.geography.country && this.metadata.geography.country.length > 0) {
      const newBounds = await computeMapBoundsForCountries(this.metadata.geography.country);
      if (newBounds !== null) {
        this.mapBounds = newBounds;
      }
    }
  },
  methods: {
    onRangeValueChanged(event: any) {
      this.changeAggregationLevel(event.target.valueAsNumber);
    },
    changeAggregationLevel(newLevel: number) {
      if (this.acceptableGeoLevels[newLevel] !== '') {
        this.aggregationLevel = newLevel;
      }
      // TODO: clear existing search text/suggestions
    },
    tickStyle(tickIndex: number) {
      const TICK_WIDTH = 8; // px
      // Tick indices are in 1..aggregationLevelCount.
      // Adjust both to be 0-indexed
      const cleanedIndex = tickIndex - 1;
      const cleanedCount = this.aggregationLevelCount - 1;
      // Space out each tick horizontally
      const percentage = cleanedIndex / cleanedCount;
      // Adjust each tick to the left so that the last one isn't overflowing
      const errorCorrect = percentage * TICK_WIDTH;
      // update color/hover style for ticks following whether they are acceptable levels or not
      return {
        left: `calc(${percentage * 100}% - ${errorCorrect}px)`,
        backgroundColor: this.acceptableGeoLevels[cleanedIndex] !== '' ? 'white' : 'gray',
        cursor: this.acceptableGeoLevels[cleanedIndex] !== '' ? 'pointer' : 'not-allowed'
      };
    },
    getGADMName(item: RegionalGADMDetail, delimter: string) {
      return Object.values(DatacubeGeoAttributeVariableType).filter(l => item[l] !== undefined).map(l => item[l]).join(delimter);
    },
    searchRegions(query: string) {
      return new Promise(resolve => {
        let suggestionResults: string[] = [];

        if (query.length < 1) resolve(suggestionResults); // early exit

        const level = this.aggregationLevelTitle; // e.g., country
        const debouncedFetchFunction = getGADMSuggestions(level, query);
        const fetchedResults = debouncedFetchFunction(); // NOTE: a debounced function may return undefined
        if (fetchedResults !== undefined) {
          fetchedResults.then((res) => {
            suggestionResults = res.map(item => {
              const regionLabel = this.getGADMName(item, REGION_ID_DISPLAY_DELIMETER);
              // cache suggestion result
              if (!this.allRegions[regionLabel]) {
                this.allRegions[regionLabel] = {
                  label: regionLabel,
                  path: this.getGADMName(item, REGION_ID_DELIMETER),
                  code: item.code as string,
                  bbox: item.bbox ? item.bbox.coordinates : []
                };
              }
              return regionLabel; // this will be displayed in the autocomplete dropdown
            });
            resolve(suggestionResults);
          });
        } else {
          resolve(suggestionResults);
        }
      });
    },
    addSelectedRegion(regionLabel: string) {
      if (regionLabel && regionLabel !== '') {
        this.selectedRegions = [this.allRegions[regionLabel]];
      }
    },
    removeSelectedRegion(region: string) {
      this.selectedRegions = this.selectedRegions.filter(r => r.label !== region);
    },
    saveSelectedRegions() {
      this.$emit('close', { cancel: false, selectedRegions: this.selectedRegions });
    },
    close(cancel = true) {
      this.$emit('close', { cancel: cancel });
    }
  }
});
</script>

<style lang="scss" scoped>
@import "~styles/variables";

$un-color-surface-30: #b3b4b5;

$track-height: 2px;
$thumb-size: 16px;
$tick-size: 8px;

:deep(.modal-container) {
  max-width: 80vw;
  width: 60vw;
  .modal-body {
    height: 50vh;
    overflow-y: scroll;
  }
}

.title {
  text-transform: initial !important;
  margin-top: 2rem;
  padding-left: 2rem;
  font-weight: bold;
  font-size: x-large !important;
}

.delete-region {
  font-size: $font-size-large;
  width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  color: #ff6955;
  cursor: pointer;

  &:hover {
    color: #850f00;
  }
}

.geo-container {
  display: flex;
  flex-direction: column;
  height: 100%
}

.flex-aligned {
  display: flex;
  align-items: baseline;
}

.selected-region {
  font-weight: bold;
  margin: 0;
  margin-right: 1rem;
}

.card-map {
  flex-grow: 1;
}

.aggregation-level-range {
  margin-top: 10px;

  &::-webkit-slider-runnable-track {
    background: $un-color-surface-30;
    height: $track-height;
  }

  &::-webkit-slider-thumb {
    margin-top: -1 * ($thumb-size - $track-height) / 2;
  }
}

.aggregation-level-tick {
  width: $tick-size;
  height: $tick-size;
  border: 2px solid $un-color-surface-30;
  border-radius: 50%;
  position: absolute;
  top: -1 * ($tick-size - $track-height) / 2;
}


.aggregation-level-range-container {
  position: relative;
  // margin: 15px 0;
}

h5 {
  margin: 0;
  margin-bottom: 5px;
}

</style>
