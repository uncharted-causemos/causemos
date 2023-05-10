<template>
  <div class="index-component-weights-container">
    <!-- Empty state (when node has no children) -->
    <header v-if="props.inputs.length === 0">
      <h4 class="de-emphasized">No components.</h4>
    </header>
    <p v-if="props.inputs.length === 0" class="de-emphasized">
      Click "Add input concept" to start building.
    </p>

    <header v-if="props.inputs.length !== 0">
      <h4>
        Component weights for <b>{{ targetName }}</b>
      </h4>
      <!-- TODO: modify weights -->
      <button class="btn btn-sm" disabled>Modify</button>
    </header>
    <div class="table-rows" v-if="props.inputs.length !== 0">
      <div class="table-row" v-for="component in props.inputs" :key="component.componentNode.id">
        <p>{{ component.componentNode.name }}</p>
        <p v-if="isEmptyNode(component.componentNode)" class="de-emphasized">No data</p>
        <p v-else>{{ precisionFormatter(component.weight) }}%</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRefs } from 'vue';
import precisionFormatter from '@/formatters/precision-formatter';
import { isEmptyNode } from '@/utils/index-tree-util';
import { WeightedComponent } from '@/types/WeightedComponent';

const props = defineProps<{
  targetName?: string | null;
  inputs: WeightedComponent[];
}>();

const { targetName } = toRefs(props);
</script>

<style lang="scss" scoped>
@import '@/styles/uncharted-design-tokens';
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

.de-emphasized {
  color: $un-color-black-40;
}
</style>
