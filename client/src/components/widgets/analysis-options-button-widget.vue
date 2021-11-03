<template>
  <div class="analysis-options-button-container">
    <button type="button" @click="isDropdownOpen = !isDropdownOpen">
      <i class="fa fa-fw fa-pencil" />
    </button>
    <dropdown-control v-if="isDropdownOpen" class="analysis-options-dropdown">
      <template #content>
        <div class="dropdown-option" @click="showRenameModal">
          Rename
        </div>
        <div
          class="dropdown-option"
          :class="{ disabled: idToDuplicate === null }"
          @click="showDuplicateModal"
        >
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
      :current-name="initialName"
      @confirm="onRenameModalConfirm"
      @cancel="isRenameModalOpen = false"
    />

    <!-- duplicate-modal is hardwired to duplicate CAGs. At time of writing,
    the data space doesn't support duplication. When it does, we should extract
    the business logic out of duplicate-modal and let each wrapper instance
    around this widget (e.g. cag-analysis-options-button) specify how the
    duplication should be performed. -->
    <duplicate-modal
      v-if="isDuplicateModalOpen"
      :current-name="initialName"
      :id-to-duplicate="idToDuplicate"
      @success="onDuplicateSuccess"
      @fail="isDuplicateModalOpen = false"
      @cancel="isDuplicateModalOpen = false"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref } from 'vue';
import RenameModal from '@/components/action-bar/rename-modal.vue';
import DropdownControl from '@/components/dropdown-control.vue';
import DuplicateModal from '../action-bar/duplicate-modal.vue';
export default defineComponent({
  components: { RenameModal, DropdownControl, DuplicateModal },
  name: 'AnalysisOptionsButtonWidget',
  props: {
    initialName: {
      type: String as PropType<string | null>,
      default: null
    },
    idToDuplicate: {
      type: String as PropType<string | null>,
      default: null
    }
  },
  emits: ['rename', 'duplicate-success', 'delete'],
  setup(props, { emit }) {
    const isDropdownOpen = ref(false);
    const isRenameModalOpen = ref(false);
    const isDuplicateModalOpen = ref(false);

    const showRenameModal = () => {
      isRenameModalOpen.value = true;
      isDropdownOpen.value = false;
    };
    const onRenameModalConfirm = (newName: string) => {
      emit('rename', newName);
      isRenameModalOpen.value = false;
    };
    const showDuplicateModal = () => {
      isDuplicateModalOpen.value = true;
      isDropdownOpen.value = false;
    };
    const onDuplicateSuccess = (name: string, newCagId: string) => {
      isDuplicateModalOpen.value = false;
      emit('duplicate-success', newCagId);
    };
    const onDelete = () => {
      emit('delete');
    };

    return {
      isDropdownOpen,
      isRenameModalOpen,
      showRenameModal,
      onRenameModalConfirm,
      isDuplicateModalOpen,
      showDuplicateModal,
      onDuplicateSuccess,
      onDelete
    };
  }
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables';

.analysis-options-button-container {
  position: relative;
}

button {
  appearance: none;
  border: none;
  margin: 0;
  padding: 0;
  height: 0.75 * $navbar-outer-height;
  width: 0.75 * $navbar-outer-height;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: $font-size-large;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
}

.analysis-options-dropdown {
  position: absolute;
  margin-top: 5px;
  width: 100px;
  right: 0;
}
</style>