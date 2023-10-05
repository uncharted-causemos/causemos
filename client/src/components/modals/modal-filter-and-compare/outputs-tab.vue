<template>
  <div class="outputs-tab-container">
    <p class="subdued un-font-small tab-description">
      Some models produce multiple outputs with each run. Select one or more of them here.
    </p>
    <div class="tab-content outputs">
      <div class="row-with-description">
        <dropdown-button
          :items="outputDropdownOptions"
          :selected-item="breakdownState.outputNames[0]"
          @item-selected="(outputName: string) => (breakdownState.outputNames[0] = outputName)"
          class="fixed-width-input"
        />
        <p class="subdued un-font-small">
          {{ getOutputDescription(outputs, breakdownState.outputNames[0]) }}
        </p>
      </div>

      <div
        v-for="(outputName, i) of breakdownState.outputNames.slice(1)"
        :key="i"
        class="row-with-description"
      >
        <div class="removable-row fixed-width-input">
          <dropdown-button
            :items="outputDropdownOptions"
            :selected-item="outputName"
            @item-selected="(outputName: string) => (breakdownState.outputNames[i + 1] = outputName)"
            class="fixed-width-input"
          />
          <button type="button" class="btn btn-default icon-button" @click="removeOutput(i + 1)">
            <i class="fa fa-fw fa-minus" />
          </button>
        </div>
        <p class="subdued un-font-small">
          {{ getOutputDescription(outputs, breakdownState.outputNames[i + 1]) }}
        </p>
      </div>
      <button class="btn btn-default fixed-width-input" @click="addOutput">
        <i class="fa fa-fw fa-plus" />Compare with another output
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import DropdownButton, { DropdownItem } from '@/components/dropdown-button.vue';
import { BreakdownStateOutputs, DatacubeFeature } from '@/types/Datacube';
import { getOutputDescription } from '@/utils/datacube-util';
import { computed, toRefs } from 'vue';

const props = defineProps<{
  breakdownState: BreakdownStateOutputs;
  outputs: DatacubeFeature[];
}>();
const { breakdownState, outputs } = toRefs(props);
const emit = defineEmits<{
  (e: 'set-breakdown-state', breakdownState: BreakdownStateOutputs): void;
}>();

const outputDropdownOptions = computed<DropdownItem[]>(() =>
  outputs.value.map((output) => ({
    displayName: output.display_name,
    value: output.name,
  }))
);

const addOutput = () => {
  const newState: BreakdownStateOutputs = {
    ...breakdownState.value,
    outputNames: [...breakdownState.value.outputNames, outputDropdownOptions.value[0].value],
  };
  emit('set-breakdown-state', newState);
};
const removeOutput = (positionInSelectedOutputsList: number) => {
  const newState: BreakdownStateOutputs = {
    ...breakdownState.value,
    outputNames: [
      ...breakdownState.value.outputNames.filter((_, i) => i !== positionInSelectedOutputsList),
    ],
  };
  emit('set-breakdown-state', newState);
};
</script>

<style lang="scss" scoped>
@import '@/styles/common';
@import '@/styles/uncharted-design-tokens';
@import '@/styles/modal-filter-and-compare';
.outputs-tab-container {
  display: flex;
  flex-direction: column;
}
.outputs {
  gap: 15px;
}
</style>
