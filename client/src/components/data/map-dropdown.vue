<template>
  <div class="map-dropdown">
    <button
      type="button"
      class="btn btn-new-cag"
      @click="onShowModelOptionsDropdown"
    >
      <div class="btn-new-cag-controls">
        <i class="layer-group fa fa-fw fa-layer-group"/>
        <span class="lbl">  Map Layers </span>
        <i class="fa fa-fw" :class="{ 'fa-angle-down': !showModelOptionsDropdown, 'fa-angle-up': showModelOptionsDropdown }"/>
      </div>
    </button>
    <dropdown-control
      v-if="showModelOptionsDropdown"
      class="CAG-operations-dropdown">
      <template #content>
        <map-dropdown-option
          :id="'default'" :name="'base'" :text="'Default'"
        />
        <map-dropdown-option
          :id="'satellite'" :name="'base'" :text="'Satellite'"
        />
        <map-dropdown-option
          :id="'admin'" :name="'first-layer'" :text="'Admin Regions'"
        />
        <map-dropdown-option
          :id="'tiles'" :name="'first-layer'" :text="'Tiles'"
        />
      </template>
    </dropdown-control>
  </div>
</template>

<script lang="ts">

import { useStore } from 'vuex';
import { defineComponent, ref, computed } from 'vue';
import DropdownControl from '@/components/dropdown-control.vue';

import { CAG } from '@/utils/messages-util';
import modelService from '@/services/model-service';
import useToaster from '@/services/composables/useToaster';
import { ProjectType } from '@/types/Enums';
import MapDropdownOption from '@/components/data/map-dropdown-option.vue';

export default defineComponent({
  name: 'ModelOptions',
  components: {
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
  props: {
    viewAfterDeletion: {
      type: String,
      default: 'qualitativeView'
    }
  },
  emits: ['rename'],
  methods: {
    onShowModelOptionsDropdown() {
      this.showModelOptionsDropdown = !this.showModelOptionsDropdown;
    },
    onRenameCagClick() {
      this.$emit('rename');
      this.showModelOptionsDropdown = false;
    },
    onDeleteCAG() {
      modelService.removeModel(this.currentCAG).then(() => {
        this.toaster(CAG.SUCCESSFUL_DELETION, 'success', false);
        // Back to splash page
        this.$router.push({
          name: this.viewAfterDeletion,
          params: {
            project: this.project,
            projectType: ProjectType.Analysis
          }
        });
      }).catch(() => {
        this.toaster(CAG.ERRONEOUS_DELETION, 'error', true);
      });
    },
    onDownload() {
      window.location.href = this.downloadURL;
    },
    onDuplicate() {
      modelService.duplicateModel(this.currentCAG).then(() => {
        this.toaster(CAG.SUCCESSFUL_DUPLICATE, 'success', false);
        // Back to splash page
        this.$router.push({
          name: this.viewAfterDeletion,
          params: {
            project: this.project,
            projectType: ProjectType.Analysis
          }
        });
      }).catch(() => {
        this.toaster(CAG.ERRONEOUS_DUPLICATE, 'error', true);
      });
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

