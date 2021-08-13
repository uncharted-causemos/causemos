import { Indicator, Model, QualifierBreakdownResponse } from '@/types/Datacube';
import { NamedBreakdownData } from '@/types/Datacubes';
import { AggregationOption } from '@/types/Enums';
import { Timeseries } from '@/types/Timeseries';
import { ADMIN_LEVEL_KEYS } from '@/utils/admin-level-util';
import { computed, Ref, ref, watch, watchEffect } from 'vue';
import {
  getQualifierBreakdown,
  getQualifierTimeseries
} from '../new-datacube-service';
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
      const existingEntry = potentiallyExistingEntry;
      if (existingEntry.data[breakdownVariableName] === undefined) {
        existingEntry.data[breakdownVariableName] = [];
      }
      options.forEach(option => {
        const { name: optionName, value } = option;
        let potentiallyExistingOption = existingEntry.data[
          breakdownVariableName
        ].find(option => option.id === optionName);
        if (potentiallyExistingOption === undefined) {
          potentiallyExistingOption = { id: optionName, values: {} };
          existingEntry.data[breakdownVariableName].push(
            potentiallyExistingOption
          );
        }
        potentiallyExistingOption.values[runId] = value;
      });
    });
  });
  return breakdownDataList;
};

export default function useQualifiers(
  metadata: Ref<Model | Indicator | null>,
  breakdownOption: Ref<string | null>,
  selectedScenarioIds: Ref<string[]>,
  temporalAggregation: Ref<AggregationOption>,
  spatialAggregation: Ref<AggregationOption>,
  selectedTimestamp: Ref<number | null>
) {
  const qualifierTimeseriesList = ref<Timeseries[]>([]);
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
    selectedQualifierValues.value = new Set();
  });

  watchEffect(async onInvalidate => {
    if (filteredQualifierVariables.value === null || metadata.value === null) {
      return;
    }
    let isCancelled = false;
    onInvalidate(() => {
      isCancelled = true;
    });
    const { data_id } = metadata.value;
    const qualifierVariableIds = filteredQualifierVariables.value.map(
      qualifier => qualifier.name
    );
    // ASSUMPTION: we'll only need to fetch the qualifier timeseries when
    //  exactly one model run is selected
    const result = await getQualifierTimeseries(
      data_id,
      selectedScenarioIds.value[0],
      activeFeature.value,
      temporalAggregation.value,
      spatialAggregation.value,
      qualifierVariableIds
    );
    console.log(result);
    if (isCancelled) return;
    qualifierTimeseriesList.value = [];
  });

  watchEffect(async onInvalidate => {
    const timestamp = selectedTimestamp.value;
    if (metadata.value === null || timestamp === null) return;
    let isCancelled = false;
    onInvalidate(() => {
      isCancelled = true;
    });
    const { data_id } = metadata.value;
    const promises = selectedScenarioIds.value.map(runId =>
      getQualifierBreakdown(
        data_id,
        runId,
        activeFeature.value,
        temporalAggregation.value,
        spatialAggregation.value,
        timestamp
      )
    );
    const responses = await Promise.all(promises);
    if (isCancelled) return;
    qualifierBreakdownData.value = convertResponsesToBreakdownData(
      responses,
      selectedScenarioIds.value
    );
  });

  return {
    qualifierTimeseriesList,
    qualifierBreakdownData,
    selectedQualifierValues
  };
}
