<template>
  <div class="analysis-options-button-container">
    <button type="button" @click="isDropdownOpen = !isDropdownOpen">
      <i class="fa fa-fw fa-line-chart analysis-type-icon" />
      <span>{{ analysisName }}</span>
      <i
        class="fa fa-fw"
        :class="{
          'fa-angle-down': !isDropdownOpen,
          'fa-angle-up': isDropdownOpen
        }"
      />
    </button>
    <dropdown-control
      v-if="isDropdownOpen"
      class="analysis-options-dropdown"
    >
      <template #content>
        <div class="dropdown-option" @click="onRename">
          Rename
        </div>
        <div class="dropdown-option disabled">
          Duplicate
        </div>
        <div class="dropdown-option" @click="onDelete">
          Delete
        </div>
      </template>
    </dropdown-control>

    <rename-modal
      v-if="isRenameModalOpen"
      :modal-title="'Rename Analysis'"
      :current-name="analysisName"
      @confirm="onRenameModalConfirm"
      @cancel="isRenameModalOpen = false"
    />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, ref } from 'vue';
import RenameModal from '@/components/action-bar/rename-modal.vue';
import DropdownControl from '@/components/dropdown-control.vue';
import { deleteAnalysis, getAnalysis, updateAnalysis } from '@/services/analysis-service';
import { useStore } from 'vuex';
import useToaster from '@/services/composables/useToaster';
import { ANALYSIS } from '@/utils/messages-util';
import router from '@/router';
import { ProjectType } from '@/types/Enums';
export default defineComponent({
  components: { RenameModal, DropdownControl },
  name: 'AnalysisOptionsButton',
  setup() {
    const toast = useToaster();
    const store = useStore();
    const analysisId = computed(() => store.getters['dataAnalysis/analysisId']);
    const project = computed(() => store.getters['app/project']);

    const isDropdownOpen = ref(false);
    const isRenameModalOpen = ref(false);
    const analysisName = ref('');

    onMounted(async () => {
      const result = await getAnalysis(analysisId.value);
      analysisName.value = result.title;
    });

    const onRename = () => {
      isRenameModalOpen.value = true;
      isDropdownOpen.value = false;
    };
    const onRenameModalConfirm = async (newName: string) => {
      if (analysisName.value !== newName) {
        try {
          await updateAnalysis(analysisId.value, { title: newName });
          analysisName.value = newName;
          toast(ANALYSIS.SUCCESSFUL_RENAME, 'success', false);
        } catch (e) {
          toast(ANALYSIS.ERRONEOUS_RENAME, 'error', true);
        }
      }
      isRenameModalOpen.value = false;
    };
    const onDelete = async () => {
      try {
        await deleteAnalysis(analysisId.value);
        toast(ANALYSIS.SUCCESSFUL_DELETION, 'success', false);
        // We need to wait for a short delay here before navigating back to the
        //  start page, since ES can take some time to refresh its indices after
        //  the delete operation, meaning the deleted analysis would still show
        //  up in the start page list.
        await new Promise<void>((resolve) => {
          setTimeout(() => { resolve(); }, 500);
        });
        // Back to DataStart page
        router.push({
          name: 'overview',
          params: {
            project: project.value,
            projectType: ProjectType.Analysis
          }
        });
      } catch (e) {
        console.error('Error occurred when deleting analysis:', e);
        toast(ANALYSIS.ERRONEOUS_DELETION, 'error', true);
      }
    };

    return {
      isDropdownOpen,
      isRenameModalOpen,
      analysisName,
      onRename,
      onRenameModalConfirm,
      onDelete
    };
  }
});
</script>

<style lang="scss" scoped>
@import "@/styles/variables";

.analysis-options-button-container {
  position: relative;
}

button {
  appearance: none;
  border: none;
  margin: 0;
  padding: 5px 10px;
  background: rgba(255, 255, 255, .1);
  color: white;
  font-weight: 600;
  font-size: $font-size-large;

  &:hover {
    background: rgba(255, 255, 255, .2);
  }
}

.analysis-type-icon {
  margin-right: 5px;
}

.analysis-options-dropdown {
  position: absolute;
  margin-top: 5px;
  width: 100px;
  right: 0;
}
</style>
