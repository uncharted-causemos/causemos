import { Indicator, Model, QualifierBreakdownResponse } from '@/types/Datacube';
import { QualifierInfo, NamedBreakdownData } from '@/types/Datacubes';
import {
  AggregationOption,
  TemporalResolutionOption
} from '@/types/Enums';
import _ from 'lodash';
import { computed, Ref, ref, watch, watchEffect } from 'vue';
import { getQualifierBreakdown } from '../new-datacube-service';
import useActiveDatacubeFeature from './useActiveDatacubeFeature';

const convertResponsesToBreakdownData = (
  responses: QualifierBreakdownResponse[][],
  breakdownOption: string | null,
  modelRunIds: string[],
  qualifierIdToNameMap: Map<string, string>
) => {
  const breakdownDataList: NamedBreakdownData[] = [];
  responses.forEach((breakdownVariables, index) => {
    const runId = modelRunIds[index];
    breakdownVariables.forEach(breakdownVariable => {
      const { name: breakdownVariableId, options } = breakdownVariable;
      const breakdownVariableDisplayName =
        qualifierIdToNameMap.get(breakdownVariableId) ?? breakdownVariableId;
      let potentiallyExistingEntry = breakdownDataList.find(
        breakdownData => breakdownData.id === breakdownVariableId
      );
      if (potentiallyExistingEntry === undefined) {
        potentiallyExistingEntry = {
          id: breakdownVariableId,
          name: breakdownVariableDisplayName,
          data: {}
        };
        breakdownDataList.push(potentiallyExistingEntry);
      }
      // We've confirmed that potentiallyExistingEntry is not undefined, so
      //  rename and strengthen Typescript type
      const existingEntry = potentiallyExistingEntry;
      if (existingEntry.data[breakdownVariableId] === undefined) {
        existingEntry.data[breakdownVariableId] = [];
      }
      options.forEach(option => {
        const { name: optionId, value } = option;
        let potentiallyExistingOption = existingEntry.data[
          breakdownVariableId
        ].find(option => option.id === optionId);
        if (potentiallyExistingOption === undefined) {
          potentiallyExistingOption = { id: optionId, values: {} };
          existingEntry.data[breakdownVariableId].push(
            potentiallyExistingOption
          );
        }
        // Value is null if a qualifier option doesn't have a value at the
        //  selected timestamp. We still include an entry in the breakdown
        //  data list so that the user can select that qualifier option to see
        //  its timeseries.
        if (value !== null) {
          if (breakdownOption) {
            // Key values here will change when we implement the missing functionality for these key values.
            potentiallyExistingOption.values[optionId] = value;
          } else {
            potentiallyExistingOption.values[runId] = value;
          }
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
  availableQualifiers: Ref<Map<string, QualifierInfo>>,
  initialSelectedQualifierValues: Ref<string[]>
) {
  const qualifierBreakdownData = ref<NamedBreakdownData[]>([]);
  const { activeFeature } = useActiveDatacubeFeature(metadata);

  const filteredQualifierVariables = computed(() => {
    if (metadata.value === null) return [];
    const { qualifier_outputs } = metadata.value;

    // Only display qualifiers marked `fetchByDefault`
    // TODO: All qualifier headings should be visible.
    //  Users should be able to request the other qualifiers by "expanding" the heading
    return (qualifier_outputs ?? [])
      .filter(qualifier => availableQualifiers.value.get(qualifier.name)?.fetchByDefault);
  });

  const selectedQualifierValues = ref<Set<string>>(new Set());
  watch([breakdownOption], () => {
    // Reset the selected qualifier value list when the selected qualifier changes
    if (selectedQualifierValues.value.size !== 0) {
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

    // Assign new object to selectedQualifierValues.value to trigger reactivity updates.
    selectedQualifierValues.value = updatedList;
  };

  watchEffect(async onInvalidate => {
    const timestamp = selectedTimestamp.value;
    const _breakdownOption = breakdownOption.value;
    if (metadata.value === null || timestamp === null) return;
    let isCancelled = false;
    onInvalidate(() => {
      isCancelled = true;
    });
    const { data_id } = metadata.value;
    const qualifierVariableIds = filteredQualifierVariables.value.map(
      variable => variable.name
    );
    const qualifierVariableNames = filteredQualifierVariables.value.map(
      variable => variable.display_name
    );
    const qualifierIdToNameMap = new Map<string, string>();
    qualifierVariableIds.forEach((id, index) => {
      const name = qualifierVariableNames[index];
      qualifierIdToNameMap.set(id, name);
    });
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
      _breakdownOption,
      selectedScenarioIds.value,
      qualifierIdToNameMap
    );
  });

  return {
    qualifierBreakdownData,
    selectedQualifierValues,
    toggleIsQualifierSelected
  };
}
