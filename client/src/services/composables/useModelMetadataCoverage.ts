import _ from 'lodash';
import timestampFormatter from '@/formatters/timestamp-formatter';
import { Indicator, Model } from '@/types/Datacube';
import { AggregationOption, TemporalResolutionOption } from '@/types/Enums';
import { SparklineData } from '@/types/Timeseries';
import { computed, Ref, ref, watch } from 'vue';
import { getSparkline } from '../outputdata-service';
import { getOutput } from '@/utils/datacube-util';

/**
 * @param metadata As returned by useModelMetadataSimple()
 * @param outputVariable The name of the dataset feature to get the sparkline for.
 * @returns The temporal coverage of the dataset, and the value range and sparkline of the output variable, if provided. Otherwise it will use the default feature of the dataset.
 */
export default function useModelMetadataCoverage(
  metadata: Ref<Model | Indicator | null>,
  outputVariable: Ref<string | null>
) {
  const sparkline = ref<number[]>([]);

  watch([metadata, outputVariable], async () => {
    if (!metadata?.value || outputVariable.value === null) return;
    const output = getOutput(metadata.value, outputVariable.value);
    if (output === undefined) {
      // outputVariable is not found in the metadata for a brief moment before metadata is fetched.
      //  Return early to avoid an unnecessary failed attempt to fetch the sparkline for the newly-
      //  updated feature that doesn't exist in the previously selected dataset.
      return;
    }
    sparkline.value = await getSparkline(
      {
        modelId: metadata.value.data_id,
        runId: 'indicator',
        outputVariable: outputVariable.value ?? metadata.value.default_feature,
        spatialAggregation:
          metadata.value.default_view?.spatialAggregation || AggregationOption.Mean,
        temporalAggregation:
          metadata.value.default_view?.temporalAggregation || AggregationOption.Mean,
        temporalResolution:
          metadata.value.default_view?.temporalResolution || TemporalResolutionOption.Month,
      },
      output?.data_resolution?.temporal_resolution,
      metadata.value?.period?.lte ?? 0
    );
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
  const temporalCoverageTimestamps = computed(() => ({
    from: metadata.value?.period?.gte ?? null,
    to: metadata.value?.period?.lte ?? null,
  }));

  return {
    sparklineData,
    temporalCoverage,
    temporalCoverageTimestamps,
    range,
  };
}
