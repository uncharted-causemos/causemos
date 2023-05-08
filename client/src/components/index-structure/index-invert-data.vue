<template>
  <div class="index-invert-data-container">
    <p class="title">Invert data to match concept</p>
    <InvertedDatasetLabel :is-inverted="props.selectedNode.dataset.isInverted" />
    <p class="sentence">
      <span class="subdued">
        High {{ props.selectedNode.dataset.datasetName }} values represent
      </span>
      <DropdownButton
        :selected-item="props.selectedNode.dataset.isInverted"
        :items="dropdownItems"
        @item-selected="(value) => emit('set-inverted', value)"
      />
      <span class="subdued"> {{ props.selectedNode.name }} values. </span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ConceptNodeWithDatasetAttached } from '@/types/Index';
import DropdownButton, { DropdownItem } from '../dropdown-button.vue';
import InvertedDatasetLabel from '../widgets/inverted-dataset-label.vue';

const dropdownItems: DropdownItem[] = [
  { displayName: 'high', value: false },
  { displayName: 'low', value: true },
];

const props = defineProps<{
  selectedNode: ConceptNodeWithDatasetAttached;
}>();

const emit = defineEmits<{
  (e: 'set-inverted', value: boolean): void;
}>();
</script>

<style lang="scss" scoped>
@import '~styles/uncharted-design-tokens';

.sentence > * {
  display: inline-block;
  &:not(:last-child) {
    margin-right: 5px;
  }
}

.title {
  margin-bottom: 5px;
}
</style>
