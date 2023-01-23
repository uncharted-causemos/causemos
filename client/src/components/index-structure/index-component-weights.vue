<template>
  <div class="index-component-weights-container">
    <header>
      <h4>Component weights</h4>
      <!-- TODO: empty state (when node has no children) -->
      <!-- TODO: modify weights -->
      <button class="btn btn-sm" disabled>Modify</button>
    </header>
    <div class="table-rows">
      <div class="table-row" v-for="component in componentWeights" :key="component.id">
        <p>
          {{ component.name }}
          <span v-if="component.type === IndexNodeType.Dataset" class="dataset-label">DATASET</span>
        </p>
        <p>{{ component.weight }}%</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IndexNodeType } from '@/types/Enums';

const componentWeights = [
  {
    id: '1',
    name: 'Highest risk of conflict',
    type: IndexNodeType.Index,
    weight: 25,
    isWeightUserSpecified: false,
  },
  {
    id: '2',
    name: 'Highest risk of drought',
    type: IndexNodeType.Index,
    weight: 25,
    isWeightUserSpecified: false,
  },
  {
    id: '3',
    name: 'Highest risk of flooding',
    type: IndexNodeType.Dataset,
    weight: 25,
    isWeightUserSpecified: false,
  },
  {
    id: '4',
    name: 'Largest vulnerable population',
    type: IndexNodeType.Index,
    weight: 25,
    isWeightUserSpecified: false,
  },
];
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
  padding: 2px 5px;
  color: $un-color-black-40;
  font-size: 1.2rem;
  line-height: 1.6rem;
  margin-left: 5px;
}
</style>
