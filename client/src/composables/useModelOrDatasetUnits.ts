import { BreakdownState, DatacubeFeature, Indicator, Model } from '@/types/Datacube';
import { Ref, computed } from 'vue';
import useOutputSpecDisplayNames from './useOutputSpecDisplayNames';
import { isBreakdownStateOutputs } from '@/utils/datacube-util';

export default function useModelOrDatasetUnits(
  breakdownState: Ref<BreakdownState | null>,
  metadata: Ref<Model | Indicator | null>,
  selectedOutputs: Ref<DatacubeFeature[]>
) {
  const { getOutputSpecName } = useOutputSpecDisplayNames(breakdownState, metadata);
  const originalUnit = computed(() => {
    const outputs = selectedOutputs.value;
    if (outputs.length === 0) return '';
    if (outputs.length === 1) return outputs[0].unit;
    const differentUnits = new Set<string>(outputs.map((output) => output.unit));
    return differentUnits.size === 1 ? outputs[0].unit : '(different units)';
  });

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

  const getUnitFromTimeseriesId = (timeseriesId: string) => {
    if (breakdownState.value !== null && isBreakdownStateOutputs(breakdownState.value)) {
      return selectedOutputs.value.find((output) => output.name === timeseriesId)?.unit ?? '';
    }
    return originalUnit.value;
  };

  return {
    originalUnit,
    unitWithComparisonStateApplied,
    getUnitFromTimeseriesId,
  };
}
