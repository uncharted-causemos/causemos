<template>
  <div class="index-action-bar-container">
    <DropdownButton
      :is-dropdown-left-aligned="true"
      :items="Object.values(DropdownOptions)"
      :selected-item="'Add Component'"
      @item-selected="handleDropdownSelection"
    />
  </div>
</template>

<script lang="ts">
import DropdownButton from '@/components/dropdown-button.vue';
export enum DropdownOptions {
  Dataset = 'Dataset',
  Index = 'Index',
}
</script>
<script setup lang="ts">
const emit = defineEmits<{
  (e: 'addDropdownChange', value: DropdownOptions): void;
}>();

const handleDropdownSelection = (option: DropdownOptions) => {
  emit('addDropdownChange', option);
};
</script>

<style scoped lang="scss">
@import '~styles/uncharted-design-tokens';

.index-action-bar-container {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 5px 20px;

  height: 51px;
  background: white;
  border-bottom: 1px solid $un-color-black-10;
}
</style>
