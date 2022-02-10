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
} from '@/types/Outputdata';
import { getRawOutputDataByTimestamp } from '@/services/outputdata-service';
import { filterRawDataByRegionIds } from '@/utils/outputdata-util';
import { DATA_LAYER } from '@/utils/map-util-new';

// This fetches raw data points for the analysis map for each output spec
export default function useRawPointsData(
  outputSpecs: Ref<OutputSpecWithId[]>,
  selectedRegionIds: Ref<string[]>,
  breakdownOption: Ref<string | null>,
  selectedDataLayer: Ref<DATA_LAYER>
) {
  // Fetch raw data points for for each output spec
  const rawDataPointsListOrigin = ref<{ id: string, points: RawOutputDataPoint[] }[]>([]);
  watchEffect(async () => {
    if (selectedDataLayer.value !== DATA_LAYER.RAW) return;
    // Fetch raw output data for each output spec
    const rawDataPromises = outputSpecs.value.map(spec => {
      const { modelId, runId, outputVariable, timestamp } = spec;
      return getRawOutputDataByTimestamp({ dataId: modelId, runId, outputVariable, timestamp })
        .then(points => ({ points, id: spec.id }));
    });
    try {
      rawDataPointsListOrigin.value = await Promise.all(rawDataPromises);
    } catch {
      rawDataPointsListOrigin.value = [];
    }
  });
  const rawDataPointsList = computed(() => {
    // Apply region filter for each raw output data
    return rawDataPointsListOrigin.value.map(data => {
      // If split by region, use output spec id which is region id as region filter.
      const regionFilter = breakdownOption.value === SpatialAggregationLevel.Region
        ? [data.id].filter(d => !!d)
        : selectedRegionIds.value;

      return filterRawDataByRegionIds(data.points, regionFilter);
    });
  });

  return {
    rawDataPointsList
  };
}
