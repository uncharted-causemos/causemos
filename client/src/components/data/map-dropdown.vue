<template>
  <div class="map-dropdown">
    <button
      type="button"
      class="btn btn-new-cag"
      @click="onShowModelOptionsDropdown"
    >
      <div class="btn-new-cag-controls">
        <i class="layer-group fa fa-fw fa-layer-group"/>
        <span class="lbl"> Map Layers </span>
        <i class="fa fa-fw" :class="{ 'fa-angle-down': !showModelOptionsDropdown, 'fa-angle-up': showModelOptionsDropdown }"/>
      </div>
    </button>
    <dropdown-control
      v-if="showModelOptionsDropdown"
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
          :id="firstLayers.ADMIN" :name="'first-layer'" :text="'Admin Regions'" :startChecked="firstLayers.ADMIN === selectedFirstLayer"
          @click="clickAdminOption"
        />
        <map-dropdown-option
          :id="firstLayers.TILES" :name="'first-layer'" :text="'Tiles'" :startChecked="firstLayers.TILES === selectedFirstLayer"
          @click="clickTilesOption"
        />
      </template>
    </dropdown-control>
  </div>
</template>

<script lang="ts">

import { mapActions, mapGetters, useStore } from 'vuex';
import { defineComponent, ref, computed } from 'vue';

import useToaster from '@/services/composables/useToaster';
import MapDropdownOption from '@/components/data/map-dropdown-option.vue';
import DropdownControl from '@/components/dropdown-control.vue';
import { BASE_LAYER, FIRST_LAYER } from '@/services/map-service';
import MapDropdownCategory from '@/components/data/map-dropdown-category.vue';

export default defineComponent({
  name: 'MapDropdown',
  components: {
    MapDropdownCategory,
    MapDropdownOption,
    DropdownControl
  },
  setup() {
    const store = useStore();
    const showModelOptionsDropdown = ref(false);

    const project = computed(() => store.getters['app/project']);
    const currentCAG = computed(() => store.getters['app/currentCAG']);

    return {
      toaster: useToaster(),
      showModelOptionsDropdown,
      project,
      currentCAG,
      downloadURL: computed(() => `/api/models/${currentCAG.value}/register-payload`)
    };
  },
  data: () => ({
    baseLayers: BASE_LAYER,
    firstLayers: FIRST_LAYER
  }),
  computed: {
    ...mapGetters({
      selectedBaseLayer: 'map/selectedBaseLayer',
      selectedFirstLayer: 'map/selectedFirstLayer'
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
      setSelectedFirstLayer: 'map/setSelectedFirstLayer'
    }),
    clickDefaultOption() {
      this.setSelectedBaseLayer(BASE_LAYER.DEFAULT);
    },
    clickSatelliteOption() {
      this.setSelectedBaseLayer(BASE_LAYER.SATELLITE);
    },
    clickAdminOption() {
      this.setSelectedFirstLayer(FIRST_LAYER.ADMIN);
    },
    clickTilesOption() {
      this.setSelectedFirstLayer(FIRST_LAYER.TILES);
    },
    onShowModelOptionsDropdown() {
      this.showModelOptionsDropdown = !this.showModelOptionsDropdown;
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

$width-name: 165px;

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

