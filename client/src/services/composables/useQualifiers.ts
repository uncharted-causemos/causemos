import { Indicator, Model } from '@/types/Datacube';
import { NamedBreakdownData, QualifierInfo } from '@/types/Datacubes';
import { QualifierBreakdownResponse } from '@/types/Outputdata';
import {
  AggregationOption,
  TemporalResolutionOption
} from '@/types/Enums';
import _ from 'lodash';
import { computed, Ref, ref, watch, watchEffect } from 'vue';
import { getQualifierBreakdown, getRawQualifierBreakdown } from '../outputdata-service';

interface QualifierVariableInfo {
  count: number;
  displayName: string;
  fetchByDefault: boolean;
}

const convertResponsesToBreakdownData = (
  existingData: NamedBreakdownData[],
  responses: QualifierBreakdownResponse[][],
  breakdownOption: string | null,
  modelRunIds: string[],
  qualifierInfoMap: Map<string, QualifierVariableInfo>,
  appendQualifier: boolean
) => {
  const breakdownDataList: NamedBreakdownData[] = appendQualifier ? existingData : [];
  responses.forEach((breakdownVariables, index) => {
    const runId = modelRunIds[index];
    breakdownVariables.forEach(breakdownVariable => {
      const { name: breakdownVariableId, options } = breakdownVariable;
      if (options !== undefined && breakdownVariableId !== undefined) {
        const breakdownVariableDisplayName =
          qualifierInfoMap.get(breakdownVariableId)?.displayName ?? breakdownVariableId;
        let potentiallyExistingEntry = breakdownDataList.find(
          breakdownData => breakdownData.id === breakdownVariableId
        );
        if (potentiallyExistingEntry === undefined) {
          potentiallyExistingEntry = {
            id: breakdownVariableId,
            name: breakdownVariableDisplayName,
            totalDataLength: qualifierInfoMap.get(breakdownVariableId)?.count ?? 0,
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
          if (value !== null && value !== undefined) {
            if (breakdownOption) {
              // Key values here will change when we implement the missing functionality for these key values.
              potentiallyExistingOption.values[optionId] = value;
            } else {
              potentiallyExistingOption.values[runId] = value;
            }
          }
        });
      }
    });
  });

  // Fill in any qualifiers from the map that don't have data
  for (const [qualifierId, qualifierInfo] of qualifierInfoMap) {
    let potentiallyExistingEntry = breakdownDataList.find(
      breakdownData => breakdownData.id === qualifierId
    );
    if (potentiallyExistingEntry === undefined) {
      potentiallyExistingEntry = {
        id: qualifierId,
        name: qualifierInfo.displayName,
        totalDataLength: qualifierInfo.count,
        data: {}
      };
      breakdownDataList.push(potentiallyExistingEntry);
    }
  }
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
  initialSelectedQualifierValues: Ref<string[]>,
  initialNonDefaultQualifiers: Ref<string[]>,
  activeFeature: Ref<string>,
  isRawDataResolution?: Ref<Boolean>
) {
  const qualifierBreakdownData = ref<NamedBreakdownData[]>([]);

  const requestedQualifier = ref<string|null>(null);
  const additionalQualifiersRequested = ref<Set<string>>(new Set());
  watch([availableQualifiers], () => {
    additionalQualifiersRequested.value = new Set();
    requestedQualifier.value = null;
  });

  const qualifierVariables = computed(() => {
    const qualifiers = new Map<string, QualifierVariableInfo>();

    const metadataQualifiers = metadata.value?.qualifier_outputs ?? [];
    for (const [name, info] of availableQualifiers.value) {
      const qualifierMeta = metadataQualifiers.find(meta => meta.name === name);
      if (qualifierMeta) {
        qualifiers.set(name, {
          count: info.count,
          displayName: qualifierMeta.display_name,
          fetchByDefault: info.fetchByDefault
        });
      }
    }
    return qualifiers;
  });

  const requestAdditionalQualifier = (qualifier: string) => {
    if (!additionalQualifiersRequested.value.has(qualifier) &&
      qualifierVariables.value.has(qualifier) && !qualifierVariables.value.get(qualifier)?.fetchByDefault
    ) {
      additionalQualifiersRequested.value.add(qualifier);
      requestedQualifier.value = qualifier;
    }
  };

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
    const desiredNonDefaultQualifiers = initialNonDefaultQualifiers.value;
    if (metadata.value === null || timestamp === null) return;
    let isCancelled = false;
    onInvalidate(() => {
      isCancelled = true;
    });
    const { data_id } = metadata.value;
    const defaultQualifierIds: string[] = [];
    for (const [name, info] of qualifierVariables.value) {
      if (info.fetchByDefault) {
        defaultQualifierIds.push(name);
      }
    }
    // If there are non-default qualifiers that should have data,
    // add them to the default list, and the set of non-default qualifier that had data requested
    const additionalQualifiers = [_breakdownOption, ...desiredNonDefaultQualifiers];
    additionalQualifiers.forEach(qualifier => {
      if (qualifier && !defaultQualifierIds.includes(qualifier) &&
        !additionalQualifiersRequested.value.has(qualifier)
      ) {
        defaultQualifierIds.push(qualifier);
        additionalQualifiersRequested.value.add(qualifier);
      }
    });
    const appendQualifier = !!requestedQualifier.value;
    const qualifiersToRequest = appendQualifier
      ? [requestedQualifier.value ?? '']
      : defaultQualifierIds;
    const promises = selectedScenarioIds.value.map(runId =>
      isRawDataResolution?.value
        ? getRawQualifierBreakdown(
          data_id,
          runId,
          activeFeature.value,
          qualifiersToRequest,
          spatialAggregation.value,
          timestamp
        )
        : getQualifierBreakdown(
          data_id,
          runId,
          activeFeature.value,
          qualifiersToRequest,
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
      qualifierBreakdownData.value,
      responses,
      _breakdownOption,
      selectedScenarioIds.value,
      qualifierVariables.value,
      appendQualifier
    );
  });

  return {
    qualifierBreakdownData,
    selectedQualifierValues,
    toggleIsQualifierSelected,
    requestAdditionalQualifier,
    nonDefaultQualifiers: additionalQualifiersRequested
  };
}
