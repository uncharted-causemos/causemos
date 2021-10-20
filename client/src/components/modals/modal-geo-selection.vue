<template>
  <modal>
    <template #header>
      <h4 class="title"><i class="fa fa-fw fa-book" />Geo selection ({{modelParam ? modelParam.type : ''}})</h4>
    </template>
    <template #body>
      <div class="geo-container">
        <div class="flex-aligned">
          <span>Search: </span>
          <auto-complete
            focus-input="true"
            style-results="true"
            placeholder-color="gray"
            placeholder-message="Type region name..."
            :search-fn="searchRegions"
            @item-selected="addSelectedRegion"
          />
        </div>
        <div class="flex-aligned" style="margin-bottom: 5px">
          <label class="selected-region">Selected Region(s):</label>
          <div
            v-for="region in selectedRegions"
            :key="region"
            class="flex-aligned">
              {{region}} <i class="fa fa-fw fa-close delete-region" @click.stop="removeSelectedRegion(region)" />
          </div>
        </div>
        <geo-selection-map
          class="card-map"
          :selected-layer-id="selectedLayer"
          :selected-base-layer="BASE_LAYER.DEFAULT"
          :selected-region="selectedRegions.length > 0 ? selectedRegions[0] : ''"
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
import { ModelParameter } from '@/types/Datacube';
import GeoSelectionMap from '@/components/data/geo-selection-map.vue';
import { stringToAdminLevel, BASE_LAYER } from '@/utils/map-util-new';
import { getGADMSuggestions } from '@/services/suggestion-service';
import { DatacubeGeoAttributeVariableType } from '@/types/Enums';
import { RegionalGADMDetail } from '@/types/Common';
import { REGION_ID_DELIMETER } from '@/utils/admin-level-util';

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
    }
  },
  computed: {
    // numeric reflecting which geo parameter we are focusing on,
    //  e.g., 0 for country, 1 for admin1 and so on
    //  assume layer at country level if invalid model param is given
    selectedLayer(): number {
      return this.modelParam ? stringToAdminLevel(this.modelParam.type as string) : 0;
    }
  },
  data: () => ({
    selectedRegions: [] as Array<string>,
    BASE_LAYER
  }),
  methods: {
    getGADMDisplayName(item: RegionalGADMDetail) {
      const displayName = Object.values(DatacubeGeoAttributeVariableType).filter(l => item[l] !== undefined).map(l => item[l] + REGION_ID_DELIMETER).join('');
      return displayName.endsWith(REGION_ID_DELIMETER) ? displayName.substring(0, displayName.lastIndexOf(REGION_ID_DELIMETER)) : displayName;
    },
    searchRegions(query: string) {
      return new Promise(resolve => {
        let suggestionResults: string[] = [];

        if (query.length < 1) resolve(suggestionResults); // early exit

        const level = this.modelParam.type as string; // e.g., country
        const debouncedFetchFunction = getGADMSuggestions(level, query);
        const fetchedResults = debouncedFetchFunction(); // NOTE: a debounced function may return undefined
        if (fetchedResults !== undefined) {
          fetchedResults.then((res) => {
            suggestionResults = res.map(item => {
              return this.getGADMDisplayName(item);
            });
            resolve(suggestionResults);
          });
        } else {
          resolve(suggestionResults);
        }
      });
    },
    addSelectedRegion(region: string) {
      this.selectedRegions = [region];
      // alternatively, enable multiple region selection
      // if (!this.selectedRegions.includes(region)) {
      //   this.selectedRegions.push(region);
      // }
    },
    removeSelectedRegion(region: string) {
      this.selectedRegions = this.selectedRegions.filter(r => r !== region);
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

::v-deep(.modal-container) {
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

</style>
