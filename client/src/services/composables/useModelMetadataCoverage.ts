import timestampFormatter from '@/formatters/timestamp-formatter';
import { Indicator, Model } from '@/types/Datacube';
import { SparklineData } from '@/types/Timeseries';
import _ from 'lodash';
import { computed, Ref } from 'vue';

export default function useModelMetadataCoverage(metadata: Ref<Model | Indicator | null>) {
  const sparklineData = computed<SparklineData | null>(() => {
    if (metadata.value?.sparkline === undefined) {
      return null;
    }
    return {
      name: '', // unused
      color: 'grey',
      series: metadata.value.sparkline,
    };
  });
  const temporalCoverage = computed(() => ({
    from:
      metadata.value === null
        ? '...'
        : timestampFormatter(metadata.value?.period.gte ?? 0, null, null),
    to:
      metadata.value === null
        ? '...'
        : timestampFormatter(metadata.value?.period.lte ?? 0, null, null),
  }));
  const range = computed(() => ({
    minimum: _.min(metadata.value?.sparkline),
    maximum: _.max(metadata.value?.sparkline),
  }));

  return {
    sparklineData,
    temporalCoverage,
    range,
  };
}
