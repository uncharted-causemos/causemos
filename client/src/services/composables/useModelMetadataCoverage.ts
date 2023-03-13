import timestampFormatter from '@/formatters/timestamp-formatter';
import { Indicator, Model } from '@/types/Datacube';
import { AggregationOption, TemporalResolutionOption } from '@/types/Enums';
import { SparklineData } from '@/types/Timeseries';
import _ from 'lodash';
import { computed, Ref, ref, watch } from 'vue';
import { getSparkline } from '../outputdata-service';

export default function useModelMetadataCoverage(metadata: Ref<Model | Indicator | null>) {
  const sparkline = ref([]);

  watch([metadata], async () => {
    if (!metadata?.value) return;
    sparkline.value = await getSparkline({
      modelId: metadata.value.data_id,
      runId: 'indicator',
      outputVariable: metadata.value.default_feature,
      spatialAggregation: metadata.value.default_view?.spatialAggregation || AggregationOption.Mean,
      temporalAggregation:
        metadata.value.default_view?.temporalAggregation || AggregationOption.Mean,
      temporalResolution:
        metadata.value.default_view?.temporalResolution || TemporalResolutionOption.Month,
    });
  });

  const sparklineData = computed<SparklineData | null>(() => {
    if (sparkline.value.length === 0) {
      return null;
    }
    return {
      name: '', // unused
      color: 'grey',
      series: sparkline.value,
    };
  });
  const temporalCoverage = computed(() => ({
    from:
      metadata.value === null
        ? '...'
        : timestampFormatter(metadata.value?.period?.gte ?? 0, null, null),
    to:
      metadata.value === null
        ? '...'
        : timestampFormatter(metadata.value?.period?.lte ?? 0, null, null),
  }));
  const range = computed(() => ({
    minimum: _.min(sparkline.value),
    maximum: _.max(sparkline.value),
  }));

  return {
    sparklineData,
    temporalCoverage,
    range,
  };
}
