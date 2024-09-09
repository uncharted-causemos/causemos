<template>
  <div class="analysis-options-button-container">
    <button type="button" @click="isDropdownOpen = !isDropdownOpen">
      <i class="fa fa-fw fa-pencil" />
    </button>
    <dropdown-control v-if="isDropdownOpen" class="analysis-options-dropdown">
      <template #content>
        <div class="dropdown-option" @click="showRenameModal">
          <i class="fa fa-fw fa-edit" /> Rename
        </div>
        <div class="dropdown-option" @click="showDuplicateModal">
          <i class="fa fa-fw fa-copy" /> Duplicate
        </div>
        <div class="dropdown-option destructive" @click="onDelete">
          <i class="fa fa-fw fa-trash" /> Delete
        </div>
      </template>
    </dropdown-control>

    <rename-modal
      v-if="isRenameModalOpen"
      :modal-title="'Rename Analysis'"
      :current-name="initialName ?? ''"
      @confirm="onRenameModalConfirm"
      @cancel="isRenameModalOpen = false"
    />

    <duplicate-modal
      v-if="isDuplicateModalOpen"
      :current-name="initialName ?? ''"
      @confirm="onDuplicate"
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
      default: null,
    },
  },
  emits: ['rename', 'duplicate', 'delete'],
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
    const onDuplicate = (name: string) => {
      isDuplicateModalOpen.value = false;
      emit('duplicate', name);
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
      onDuplicate,
      onDelete,
    };
  },
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
  background: var(--p-surface-50);
  color: var(--p-text-muted-color);
  font-size: $font-size-large;
  cursor: pointer;

  &:hover {
    color: var(--p-text-color);
  }
}

.analysis-options-dropdown {
  position: absolute;
  margin-top: 5px;
  width: 110px;
  right: 0;
}
.destructive {
  color: $negative;
}
</style>
