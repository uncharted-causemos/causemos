import { Datacube } from '@/types/Datacube';
import { computed, ref, Ref, watch, watchEffect } from 'vue';
import { getOutputs } from '@/utils/datacube-util';
import _ from 'lodash';
import { OutputVariableSpecs } from '@/types/Outputdata';
import {
  AggregationOption,
  DataTransform,
  TemporalResolutionOption
} from '@/types/Enums';

export default function useDatacubeFeatures(
  metadata: Ref<Datacube | null>,
  // FIXME: rename to use consistent feature naming
  initialSelectedOutputVariables: Ref<string[]>,
  initialActiveFeatures: Ref<OutputVariableSpecs[]>,
  activeFeatureName: Ref<string>,
  selectedTemporalResolution: Ref<TemporalResolutionOption>,
  selectedTemporalAggregation: Ref<AggregationOption>,
  selectedSpatialAggregation: Ref<AggregationOption>,
  selectedTransform: Ref<DataTransform>
) {
  // FIXME: rename to 'datacubeFeatures'?
  const outputs = computed(() => {
    if (metadata.value === null) return null;
    const currOutputs = getOutputs(metadata.value);
    return currOutputs.length >= 1 ? currOutputs : null;
  });

  // FIXME: it's confusing to have selectedFeatures and activeFeatures. This is
  //  because the latter has an inaccurate name. It stores the
  //  resolution/aggregation/transform selections for each feature in `outputs`
  // FIXME: rename to `featureConfigs`.
  // FIXME: rename OutputVariableSpecs to FeatureConfig
  const activeFeatures = ref<OutputVariableSpecs[]>([]);
  // FIXME: should these be split into two different watchers?
  // 1. We're restoring state after initial load, or after applying an insight
  // 2. We're loading them from outputs (which comes from metadata)
  // But it seems like we don't want to load from metadata if the first case has
  //  already occurred? This logic can almost certainly be simplified
  watch(
    () => [initialActiveFeatures.value, outputs.value],
    () => {
      // are we restoring state post init or after an insight has been loaded?
      if (initialActiveFeatures.value.length > 0) {
        activeFeatures.value = _.cloneDeep(initialActiveFeatures.value);
      } else {
        // create the initial list of activeFeatures if datacube outputs have been loaded
        if (outputs.value !== null) {
          activeFeatures.value = outputs.value.map(output => ({
            name: output.name,
            display_name: output.display_name,
            temporalResolution: selectedTemporalResolution.value,
            temporalAggregation: selectedTemporalAggregation.value,
            spatialAggregation: selectedSpatialAggregation.value,
            transform: selectedTransform.value
          }));
        }
      }
    }
  );

  // Whenever the resolution/aggregations/transform for the selected feature
  //  changes, find the selected feature in the `activeFeatures` list and update
  //  it.
  watch(
    () => [
      selectedTemporalAggregation.value,
      selectedTemporalResolution.value,
      selectedSpatialAggregation.value,
      selectedTransform.value
    ],
    () => {
      // re-build activeFeatures since it hosts the config options for each variable
      const updatedActiveFeatures = _.cloneDeep(activeFeatures.value);
      const featureIndx = updatedActiveFeatures.findIndex(
        feature => feature.name === activeFeatureName.value
      );
      if (featureIndx >= 0) {
        updatedActiveFeatures[featureIndx].temporalAggregation =
          selectedTemporalAggregation.value;
        updatedActiveFeatures[featureIndx].temporalResolution =
          selectedTemporalResolution.value;
        updatedActiveFeatures[featureIndx].spatialAggregation =
          selectedSpatialAggregation.value;
        updatedActiveFeatures[featureIndx].transform = selectedTransform.value;

        activeFeatures.value = updatedActiveFeatures;
      }
    }
  );

  // FIXME: previously called selectedBreakdownOutputVariables
  const selectedFeatureNames = ref(new Set<string>());
  // FIXME: previously called toggleIsOutputVariableSelected
  const toggleIsFeatureSelected = (outputVariable: string) => {
    const updatedList = _.clone(selectedFeatureNames.value);
    // If an output variable is currently selected, remove it from the list
    if (selectedFeatureNames.value.has(outputVariable)) {
      updatedList.delete(outputVariable);
    } else {
      // Else add it to the list of selected output variables.
      updatedList.add(outputVariable);
    }
    // Assign new object to selectedFeatureNames.value to trigger reactivity updates.
    selectedFeatureNames.value = updatedList;
  };
  watchEffect(() => {
    selectedFeatureNames.value = new Set(initialSelectedOutputVariables.value);
  });

  // FIXME: previously named filteredActiveFeatures
  // FIXME: rename to `selectedFeatureConfigs` when activeFeatures is renamed.
  const selectedFeatures = computed(() => {
    return activeFeatures.value.filter(feature =>
      selectedFeatureNames.value.has(feature.display_name)
    );
  });

  return {
    outputs,
    activeFeatures,
    selectedFeatures,
    selectedFeatureNames,
    toggleIsFeatureSelected
  };
}
