import { Indicator, Model, QualifierBreakdownResponse } from '@/types/Datacube';
import { NamedBreakdownData } from '@/types/Datacubes';
import { AggregationOption, TemporalResolutionOption } from '@/types/Enums';
import { ADMIN_LEVEL_KEYS } from '@/utils/admin-level-util';
import _ from 'lodash';
import { computed, Ref, ref, watch, watchEffect } from 'vue';
import { getQualifierBreakdown } from '../new-datacube-service';
import useActiveDatacubeFeature from './useActiveDatacubeFeature';

const QUALIFIERS_TO_EXCLUDE = [
  ...ADMIN_LEVEL_KEYS,
  'timestamp',
  'lat',
  'lng',
  'feature',
  'value'
];

const convertResponsesToBreakdownData = (
  responses: QualifierBreakdownResponse[][],
  modelRunIds: string[]
) => {
  const breakdownDataList: NamedBreakdownData[] = [];
  responses.forEach((breakdownVariables, index) => {
    const runId = modelRunIds[index];
    breakdownVariables.forEach(breakdownVariable => {
      const { name: breakdownVariableName, options } = breakdownVariable;
      let potentiallyExistingEntry = breakdownDataList.find(
        breakdownData => breakdownData.name === breakdownVariableName
      );
      if (potentiallyExistingEntry === undefined) {
        potentiallyExistingEntry = {
          name: breakdownVariableName,
          data: {}
        };
        breakdownDataList.push(potentiallyExistingEntry);
      }
      // We've confirmed that potentiallyExistingEntry is not undefined, so
      //  rename and strengthen Typescript type
      const existingEntry = potentiallyExistingEntry;
      if (existingEntry.data[breakdownVariableName] === undefined) {
        existingEntry.data[breakdownVariableName] = [];
      }
      options.forEach(option => {
        const { name: optionId, value } = option;
        let potentiallyExistingOption = existingEntry.data[
          breakdownVariableName
        ].find(option => option.id === optionId);
        if (potentiallyExistingOption === undefined) {
          potentiallyExistingOption = { id: optionId, values: {} };
          existingEntry.data[breakdownVariableName].push(
            potentiallyExistingOption
          );
        }
        // Value is null if a qualifier option doesn't have a value at the
        //  selected timestamp. We still include an entry in the breakdown
        //  data list so that the user can select that qualifier option to see
        //  its timeseries.
        if (value !== null) {
          potentiallyExistingOption.values[runId] = value;
        }
      });
    });
  });
  return breakdownDataList;
};

export default function useQualifiers(
  metadata: Ref<Model | Indicator | null>,
  breakdownOption: Ref<string | null>,
  selectedScenarioIds: Ref<string[]>,
  temporalResolution: Ref<TemporalResolutionOption>,
  temporalAggregation: Ref<AggregationOption>,
  spatialAggregation: Ref<AggregationOption>,
  selectedTimestamp: Ref<number | null>,
  initialSelectedQualifierValues: Ref<string[]>
) {
  const qualifierBreakdownData = ref<NamedBreakdownData[]>([]);
  const { activeFeature } = useActiveDatacubeFeature(metadata);

  const filteredQualifierVariables = computed(() => {
    if (metadata.value === null) return [];
    const { qualifier_outputs } = metadata.value;
    return (qualifier_outputs ?? [])
      .filter(qualifier => qualifier.is_visible)
      .filter(qualifier => !QUALIFIERS_TO_EXCLUDE.includes(qualifier.name));
  });

  const selectedQualifierValues = ref<Set<string>>(new Set());
  watch([metadata, breakdownOption], () => {
    // Reset the selected qualifier value list when the selected qualifier changes
    if (selectedQualifierValues.value.keys.length !== 0) {
      selectedQualifierValues.value = new Set();
    }
  });
  watchEffect(() => {
    if (initialSelectedQualifierValues.value.length === 0) {
      return;
    }
    // Reset the selected qualifier value list when there is an initial list of selected qualifier values
    const initialQualifierList = new Set<string>();
    initialSelectedQualifierValues.value.forEach(qualifierValue => {
      initialQualifierList.add(qualifierValue);
    });
    selectedQualifierValues.value = initialQualifierList;
  });

  const toggleIsQualifierSelected = (qualifierValue: string) => {
    const isQualifierValueSelected = selectedQualifierValues.value.has(
      qualifierValue
    );
    const updatedList = _.clone(selectedQualifierValues.value);
    if (isQualifierValueSelected) {
      // If qualifier value is currently selected, remove it from the list of
      //  selected qualifier values.
      updatedList.delete(qualifierValue);
    } else {
      // Else add it to the list of selected qualifier values.
      updatedList.add(qualifierValue);
    }

    // Assign new object to selectedRegionIdsAtAllLevels.value to trigger reactivity updates.
    selectedQualifierValues.value = updatedList;
  };

  watchEffect(async onInvalidate => {
    const timestamp = selectedTimestamp.value;
    if (metadata.value === null || timestamp === null) return;
    let isCancelled = false;
    onInvalidate(() => {
      isCancelled = true;
    });
    const { data_id } = metadata.value;
    const qualifierVariableIds = filteredQualifierVariables.value.map(
      variable => variable.name
    );
    const promises = selectedScenarioIds.value.map(runId =>
      getQualifierBreakdown(
        data_id,
        runId,
        activeFeature.value,
        qualifierVariableIds,
        temporalResolution.value,
        temporalAggregation.value,
        spatialAggregation.value,
        timestamp
      )
    );
    // FIXME: OPTIMIZATION: Placing a separate request for each run eats into
    //  the maximum number of concurrent requests, resulting in closer to
    //  serial performance and slowing down other calls. We should update this
    //  endpoint to accept a list of run IDs so only one request is necessary.
    const responses = await Promise.all(promises);
    if (isCancelled) return;
    qualifierBreakdownData.value = convertResponsesToBreakdownData(
      responses,
      selectedScenarioIds.value
    );
  });

  return {
    qualifierBreakdownData,
    selectedQualifierValues,
    toggleIsQualifierSelected
  };
}
