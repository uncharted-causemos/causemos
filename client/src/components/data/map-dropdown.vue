<template>
  <div class="map-dropdown">
    <button
      type="button"
      class="btn map-dropdown-button"
      @click="onShowDropdownOptions"
    >
      <div class="map-dropdown-button-controls">
        <img
          class="logo"
          src="../../assets/layers_icon.svg"
        >
        <span class="lbl"> Map Layers </span>
        <i class="fa fa-fw" :class="{ 'fa-angle-down': !showDropdownOptions, 'fa-angle-up': showDropdownOptions }"/>
      </div>
    </button>
    <dropdown-control
      v-if="showDropdownOptions"
      class="CAG-operations-dropdown">
      <template #content>
        <map-dropdown-category :text="'BASE LAYERS'"/>
        <map-dropdown-option
          :id="baseLayers.DEFAULT" :name="'base'" :text="'Default'" :startChecked="baseLayers.DEFAULT === selectedBaseLayer"
          @click="clickDefaultOption"
        />
        <map-dropdown-option
          :id="baseLayers.SATELLITE" :name="'base'" :text="'Satellite'" :startChecked="baseLayers.SATELLITE === selectedBaseLayer"
          @click="clickSatelliteOption"
        />
        <map-dropdown-category :text="'DATA LAYERS'"/>
        <map-dropdown-option
          :id="firstLayers.ADMIN" :name="'first-layer'" :text="'Admin Regions'" :startChecked="firstLayers.ADMIN === selectedDataLayer"
          @click="clickAdminOption"
        />
        <map-dropdown-option
          :id="firstLayers.TILES" :name="'first-layer'" :text="'Tiles'" :startChecked="firstLayers.TILES === selectedDataLayer"
          @click="clickTilesOption"
        />
      </template>
    </dropdown-control>
  </div>
</template>

<script lang="ts">

import { defineComponent } from 'vue';

import MapDropdownOption from '@/components/data/map-dropdown-option.vue';
import DropdownControl from '@/components/dropdown-control.vue';
import { BASE_LAYER, DATA_LAYER } from '@/utils/map-util-new';
import MapDropdownCategory from '@/components/data/map-dropdown-category.vue';

export default defineComponent({
  name: 'MapDropdown',
  components: {
    MapDropdownCategory,
    MapDropdownOption,
    DropdownControl
  },
  data: () => ({
    baseLayers: BASE_LAYER,
    firstLayers: DATA_LAYER,
    showDropdownOptions: false
  }),
  props: {
    selectedBaseLayer: {
      type: String,
      required: true
    },
    selectedDataLayer: {
      type: String,
      required: true
    },
    viewAfterDeletion: {
      type: String,
      default: 'qualitativeView'
    }
  },
  emits: ['rename', 'set-base-layer', 'set-data-layer'],
  methods: {
    clickDefaultOption() {
      this.$emit('set-base-layer', BASE_LAYER.DEFAULT);
    },
    clickSatelliteOption() {
      this.$emit('set-base-layer', BASE_LAYER.SATELLITE);
    },
    clickAdminOption() {
      this.$emit('set-data-layer', DATA_LAYER.ADMIN);
    },
    clickTilesOption() {
      this.$emit('set-data-layer', DATA_LAYER.TILES);
    },
    onShowDropdownOptions() {
      this.showDropdownOptions = !this.showDropdownOptions;
    }
  }
});
</script>

<style lang="scss" scoped>

$dropdown-width: 160px;

.map-dropdown {
  .map-dropdown-button {
    padding: 5px;
    background-color: #f2f2f2;
    border: 1px solid gray;
    .map-dropdown-button-controls {
      margin: auto;
      width: fit-content;
      .logo {
        padding-bottom: 2px;
        padding-right: 2px;
      }
    }
  }
  .CAG-operations-dropdown {
    position: absolute;
    width: $dropdown-width - 20px;
    .dropdown-option {
      border-bottom: 1px solid lightgray;
      border-top: 1px solid lightgray;
    }
  }
}

</style>

