<template>
  <div class="comparison-settings-container">
    <p>Comparison settings</p>
    <label class="un-font-small">
      <input
        type="radio"
        name="display-absolute-values"
        :checked="comparisonSettings.shouldDisplayAbsoluteValues === true"
        @input="setComparisonSettings(true)"
      />
      Display absolute values
    </label>
    <label class="un-font-small">
      <input
        disabled
        type="radio"
        name="display-absolute-values"
        :checked="comparisonSettings.shouldDisplayAbsoluteValues === false"
        @input="setComparisonSettings(false)"
      />
      Display values relative to
    </label>
    <!-- TODO: change baseline and units -->
    <!-- <dropdown-button
          :items="comparisonBaselineOptions"
          :selected-item="comparisonSettings.baselineTimeseriesId"
          class="fixed-width-input"
          @item-selected="
            (timeseriesId: string) =>
              setComparisonSettings(
                false,
                timeseriesId,
                breakdownState.comparisonSettings.shouldUseRelativePercentage
              )
          "
        /> -->
  </div>
</template>

<script setup lang="ts">
import { DropdownItem } from '@/components/dropdown-button.vue';
import { ComparisonSettings } from '@/types/Datacube';
import { toRefs } from 'vue';

const props = defineProps<{
  comparisonSettings: ComparisonSettings;
  comparisonBaselineOptions: DropdownItem[];
}>();
const { comparisonSettings } = toRefs(props);
const emit = defineEmits<{ (e: 'set-comparison-settings', newState: ComparisonSettings): void }>();

const setComparisonSettings = (
  shouldDisplayAbsoluteValues: boolean,
  baselineTimeseriesId?: string,
  shouldUseRelativePercentage?: boolean
) => {
  const newState: ComparisonSettings = {
    shouldDisplayAbsoluteValues,
    // Only update baselineTimeseriesId and shouldUseRelativePercentage if optional parameters are defined
    baselineTimeseriesId: baselineTimeseriesId ?? comparisonSettings.value.baselineTimeseriesId,
    shouldUseRelativePercentage:
      shouldUseRelativePercentage ?? comparisonSettings.value.shouldUseRelativePercentage,
  };
  emit('set-comparison-settings', newState);
};
</script>

<style lang="scss" scoped>
@import '@/styles/uncharted-design-tokens';
.comparison-settings-container {
  display: flex;
  flex-direction: column;
  padding: 10px 20px;
  border: 1px solid $un-color-black-10;
  gap: 10px;

  label {
    display: flex;
    gap: 10px;
  }
}
</style>
