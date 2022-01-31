import _ from 'lodash';
import {
  computed,
  watchEffect
} from 'vue';
import { Ref, ref } from '@vue/reactivity';
import { SpatialAggregationLevel } from '@/types/Enums';
import {
  OutputSpecWithId,
  RawOutputDataPoint
} from '@/types/Runoutput';
import { getRawOutputDataByTimestamp } from '@/services/runoutput-service';
import { filterRawDataByRegionIds } from '@/utils/outputdata-util';

export default function useRawPointsData(
  outputSpecs: Ref<OutputSpecWithId[]>,
  selectedRegionIds: Ref<string[]>,
  breakdownOption: Ref<string | null>
) {
  // Fetch raw data points for for each output spec
  const rawDataPointsListOrigin = ref<RawOutputDataPoint[][]>([]);
  watchEffect(async () => {
    // Fetch raw output data for each output spec
    const rawDataPromises = outputSpecs.value.map(spec => {
      const { modelId, runId, outputVariable, timestamp } = spec;
      return timestamp === null
        ? Promise.resolve([])
        : getRawOutputDataByTimestamp({ dataId: modelId, runId, outputVariable, timestamp });
    });
    rawDataPointsListOrigin.value = await Promise.all(rawDataPromises);
  });
  const rawDataPointsList = computed(() => {
    // Apply region filter for each raw output data
    return rawDataPointsListOrigin.value.map((points, index) => {
      // If split by region, use output spec id which is region id as region filter.
      const regionFilter = breakdownOption.value === SpatialAggregationLevel.Region
        ? [outputSpecs.value[index].id].filter(id => !!id) // filter out null or undefined ids
        : selectedRegionIds.value;

      return filterRawDataByRegionIds(points, regionFilter);
    });
  });

  return {
    rawDataPointsList
  };
}
