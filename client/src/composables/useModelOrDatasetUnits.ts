import { BreakdownState, DatacubeFeature, Indicator, Model } from '@/types/Datacube';
import { Ref, computed } from 'vue';
import useOutputSpecDisplayNames from './useOutputSpecDisplayNames';

export default function useModelOrDatasetUnits(
  breakdownState: Ref<BreakdownState | null>,
  metadata: Ref<Model | Indicator | null>,
  activeOutputVariable: Ref<DatacubeFeature | null>
) {
  const { getOutputSpecName } = useOutputSpecDisplayNames(breakdownState, metadata);
  const originalUnit = computed(() => activeOutputVariable.value?.unit ?? '');

  // If "relative to" mode and "should use relative percentage of baseline" mode are active, units
  //  become "percentage relative to baseline" rather than the original units.
  const unitWithComparisonStateApplied = computed(() => {
    if (breakdownState.value === null) {
      return originalUnit.value;
    }
    const { shouldDisplayAbsoluteValues, shouldUseRelativePercentage, baselineTimeseriesId } =
      breakdownState.value.comparisonSettings;
    if (shouldDisplayAbsoluteValues === false && shouldUseRelativePercentage === true) {
      return `% change from ${getOutputSpecName(baselineTimeseriesId)}`;
    }
    return originalUnit.value;
  });

  return {
    originalUnit,
    unitWithComparisonStateApplied,
  };
}
