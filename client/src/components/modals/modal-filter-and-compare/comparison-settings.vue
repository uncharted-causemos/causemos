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
    <label class="un-font-small relative-to-radio-button-row">
      <input
        type="radio"
        name="display-absolute-values"
        :checked="comparisonSettings.shouldDisplayAbsoluteValues === false"
        @input="setComparisonSettings(false)"
      />
      Display values relative to
      <DropdownButton
        :items="comparisonBaselineOptions"
        :selected-item="comparisonSettings.baselineTimeseriesId"
        class="fixed-width-input"
        @item-selected="
          (timeseriesId: string) =>setComparisonSettings(false, timeseriesId)
        "
      />
    </label>
    <div
      class="un-font-small radio-button-group"
      v-if="!comparisonSettings.shouldDisplayAbsoluteValues"
    >
      as
      <SelectButton
        :options="radioButtonGroupOptions"
        :model-value="comparisonSettings.shouldUseRelativePercentage"
        option-label="label"
        option-value="value"
        @update:model-value="setShouldUseRelativePercentage"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import DropdownButton, { DropdownItem } from '@/components/dropdown-button.vue';
import { ComparisonSettings } from '@/types/Datacube';
import SelectButton from 'primevue/selectbutton';
import { computed, toRefs } from 'vue';

const props = defineProps<{
  comparisonSettings: ComparisonSettings;
  comparisonBaselineOptions: DropdownItem[];
  unit: string;
}>();
const { comparisonSettings, comparisonBaselineOptions, unit } = toRefs(props);
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

const relativePercentageDisplayString = computed(() => {
  const baselineId = comparisonSettings.value.baselineTimeseriesId;
  const baselineTimeseriesName =
    comparisonBaselineOptions.value.find((option) => option.value === baselineId)?.displayName ??
    'baseline';
  return `% change from ${baselineTimeseriesName}`;
});

const radioButtonGroupOptions = computed<{ value: boolean; label: string }[]>(() => [
  { value: false, label: unit.value },
  { value: true, label: relativePercentageDisplayString.value },
]);

const setShouldUseRelativePercentage = (newValue: boolean) => {
  const { shouldDisplayAbsoluteValues, baselineTimeseriesId } = comparisonSettings.value;
  setComparisonSettings(shouldDisplayAbsoluteValues, baselineTimeseriesId, newValue);
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

  label,
  .radio-button-group {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }

  .radio-button-group {
    margin-left: 24px;
  }
}
</style>
