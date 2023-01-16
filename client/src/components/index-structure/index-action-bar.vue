<template>
  <div class="index-action-bar">
    <DropdownButton
      :is-dropdown-left-aligned="true"
      :items="DROPDOWN_OPTIONS"
      :selected-item="'Add'"
      @item-selected="handleDropdownSelection"
    />
  </div>
</template>

<script lang="ts">
import DropdownButton from '@/components/dropdown-button.vue';
const DROPDOWN_OPTIONS = ['Dataset', 'Index'] as const;
export type DropdownOptions = typeof DROPDOWN_OPTIONS[number];
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
.index-action-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 5px 88px;

  height: 51px;
  background: #ffffff;
}
</style>
