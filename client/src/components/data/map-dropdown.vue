<template>
  <div class="map-dropdown">
    <button
      type="button"
      class="btn btn-new-cag"
      @click="onShowDropdownOptions"
    >
      <div class="btn-new-cag-controls">
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

import { mapActions, mapGetters } from 'vuex';
import { defineComponent } from 'vue';

import MapDropdownOption from '@/components/data/map-dropdown-option.vue';
import DropdownControl from '@/components/dropdown-control.vue';
import { BASE_LAYER, DATA_LAYER } from '@/services/map-service';
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
  computed: {
    ...mapGetters({
      selectedBaseLayer: 'map/selectedBaseLayer',
      selectedDataLayer: 'map/selectedDataLayer'
    })
  },
  props: {
    viewAfterDeletion: {
      type: String,
      default: 'qualitativeView'
    }
  },
  emits: ['rename'],
  methods: {
    ...mapActions({
      setSelectedBaseLayer: 'map/setSelectedBaseLayer',
      setSelectedDataLayer: 'map/setSelectedDataLayer'
    }),
    clickDefaultOption() {
      this.setSelectedBaseLayer(BASE_LAYER.DEFAULT);
    },
    clickSatelliteOption() {
      this.setSelectedBaseLayer(BASE_LAYER.SATELLITE);
    },
    clickAdminOption() {
      this.setSelectedDataLayer(DATA_LAYER.ADMIN);
    },
    clickTilesOption() {
      this.setSelectedDataLayer(DATA_LAYER.TILES);
    },
    onShowDropdownOptions() {
      this.showDropdownOptions = !this.showDropdownOptions;
    }
  }
});
</script>

<style lang="scss" scoped>

.CAG-operations-dropdown .dropdown-option {
  border-bottom: 1px solid lightgray;
  border-top: 1px solid lightgray;
}

</style>

<style lang="scss" scoped>

$width-name: 160px;

.map-dropdown {
  padding: 0px 10px;
  margin: 5px 0;
  width: $width-name;
  .btn-new-cag {
    text-align: left;
    padding: 5px;
    background-color: #f2f2f2;
    border: 1px solid gray;
    width: 100%;
    .btn-new-cag-controls {
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
    width: $width-name - 20px;

  }
}

a {
  text-decoration: inherit;
  color: inherit;
}
</style>

