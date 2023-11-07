<template>
  <div
    class="recent-analysis-container"
    @click="emit('open', analysis)"
    v-tooltip="{ content: analysis.subtitle, html: true }"
  >
    <span class="un-font-small">
      {{ analysis.title }}
    </span>
    <OptionsButton
      class="more-options-button"
      :wider-dropdown-options="true"
      :dropdown-below="true"
      @click.stop
    >
      <template #content>
        <div class="dropdown-option" @click="emit('open', analysis)">
          <i class="fa fa-fw fa-folder-open-o" /> Open
        </div>
        <div class="dropdown-option" @click="emit('rename', analysis)">
          <i class="fa fa-fw fa-edit" /> Rename
        </div>
        <div class="dropdown-option" @click="emit('duplicate', analysis)">
          <i class="fa fa-fw fa-copy" /> Duplicate
        </div>
        <div class="dropdown-option destructive" @click="isShowingDeleteModal = true">
          <i class="fa fa-fw fa-trash" /> Delete
        </div>
      </template>
    </OptionsButton>
    <ModalConfirmation
      v-if="isShowingDeleteModal"
      :autofocus-confirm="false"
      @confirm="deleteAnalysis"
      @close="isShowingDeleteModal = false"
    >
      <template #title>Remove analysis</template>
      <template #message>
        <p>
          Are you sure you want to remove <strong>{{ analysis.title }}</strong
          >?
        </p>
        <MessageDisplay
          :message="'Warning: This action cannot be undone.'"
          :message-type="'alert-warning'"
        />
      </template>
    </ModalConfirmation>
  </div>
</template>

<script setup lang="ts">
import { Analysis } from '@/types/Analysis';
import { ref } from 'vue';
import OptionsButton from '../widgets/options-button.vue';
import ModalConfirmation from '../modals/modal-confirmation.vue';
import MessageDisplay from '../widgets/message-display.vue';

const props = defineProps<{ analysis: Analysis }>();
const emit = defineEmits<{
  (e: 'open', analysis: Analysis): void;
  (e: 'delete', analysis: Analysis): void;
  (e: 'duplicate', analysis: Analysis): void;
  (e: 'rename', analysis: Analysis): void;
}>();
const isShowingDeleteModal = ref(false);
const deleteAnalysis = () => {
  emit('delete', props.analysis);
  isShowingDeleteModal.value = false;
};
</script>

<style lang="scss" scoped>
@import '@/styles/uncharted-design-tokens';

.recent-analysis-container {
  border-top: 1px solid $un-color-black-10;
  padding: 5px;
  padding-left: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;

  --options-button-size: 20px;

  span {
    flex: 1;
    min-width: 0;
    line-height: var(--options-button-size);
    color: $un-color-black-70;
  }

  .more-options-button {
    display: none;
  }
  &:hover .more-options-button {
    display: inline-block;
  }

  &:hover {
    background: white;
  }
}

:deep(.options-button-container) {
  width: var(--options-button-size);
  height: var(--options-button-size);

  i {
    font-size: 14px;
  }

  .dropdown-container.visible {
    top: var(--options-button-size);
    right: 0;
  }
}
</style>
