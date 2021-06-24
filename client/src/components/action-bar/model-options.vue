<template>
  <li class="nav-item">
    <button
      type="button"
      class="btn btn-new-cag"
      @click="onShowModelOptionsDropdown"
    ><span class="lbl">{{ cagName }}</span>
      <i
        class="fa fa-fw"
        :class="{ 'fa-angle-down': !showModelOptionsDropdown, 'fa-angle-up': showModelOptionsDropdown }"
      />
    </button>
    <dropdown-control
      v-if="showModelOptionsDropdown"
      class="CAG-operations-dropdown">
      <template #content>
        <div
          class="dropdown-option"
          @click="onRenameCagClick"
        >
          Rename
        </div>
        <div
          class="dropdown-option"
          @click="onDuplicate"
        >
          Duplicate
        </div>
        <div
          class="dropdown-option"
          @click="onDeleteCAG"
        >
          Delete
        </div>
        <div
          class="dropdown-option"
          @click="onDownload">
          <a :href="downloadURL"> Download </a>
        </div>
      </template>
    </dropdown-control>
  </li>
</template>

<script lang="ts">

import { useStore } from 'vuex';
import { defineComponent, ref, computed } from 'vue';
import DropdownControl from '@/components/dropdown-control.vue';

import { CAG } from '@/utils/messages-util';
import modelService from '@/services/model-service';
import useToaster from '@/services/composables/useToaster';
import { ProjectType } from '@/types/Enums';

export default defineComponent({
  name: 'ModelOptions',
  components: {
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
    cagName: {
      type: String,
      default: 'untitled'
    },
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

$width-name: 10vw;

.CAG-operations-dropdown {
  position: absolute;
  margin-top: 2px;
  width: $width-name;
}

.btn-new-cag {
  min-width: $width-name;
  text-align: left;
  background-color: transparent;
  i {
    margin: 0 10px;
  }
}

a {
  text-decoration: inherit;
  color: inherit;
}
</style>
