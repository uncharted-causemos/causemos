<template>
  <div class="index-component-weights-container">
    <!-- Empty state (when node has no children) -->
    <header v-if="props.inputs.length === 0">
      <h4 class="de-emphasized">No components.</h4>
    </header>
    <p v-if="props.inputs.length === 0" class="de-emphasized">
      Click "Add component" to start building.
    </p>

    <header v-if="props.inputs.length !== 0">
      <h4>Component weights</h4>
      <!-- TODO: modify weights -->
      <button class="btn btn-sm" disabled>Modify</button>
    </header>
    <div class="table-rows" v-if="props.inputs.length !== 0">
      <div class="table-row" v-for="component in props.inputs" :key="component.id">
        <p>
          {{ component.name }}
          <span v-if="component.type === IndexNodeType.Dataset" class="dataset-label">DATASET</span>
        </p>
        <p v-if="isPlaceholderNode(component)" class="de-emphasized">Placeholder</p>
        <p v-else>{{ precisionFormatter(component.weight) }}%</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import precisionFormatter from '@/formatters/precision-formatter';
import { IndexNodeType } from '@/types/Enums';
import { IndexWorkBenchItem } from '@/types/Index';
import { isPlaceholderNode } from '@/utils/index-tree-util';

const props = defineProps<{
  inputs: IndexWorkBenchItem[];
}>();
</script>

<style lang="scss" scoped>
@import '~styles/uncharted-design-tokens';
.index-component-weights-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-rows {
  display: flex;
  flex-direction: column;
}

.table-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;

  &:not(:first-child) {
    border-top: 1px solid $un-color-black-5;
  }
}

.dataset-label {
  border: 1px solid $un-color-black-40;
  padding: 0 3px;
  color: $un-color-black-40;
  font-size: 1.2rem;
  line-height: 1.6rem;
  margin-left: 5px;
}

.de-emphasized {
  color: $un-color-black-40;
}
</style>
