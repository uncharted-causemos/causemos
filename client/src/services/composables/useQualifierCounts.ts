import { Indicator, Model, QualifierThresholds } from '@/types/Datacube';
import { QualifierCountsResponse } from '@/types/Outputdata';
import { QualifierInfo } from '@/types/Datacubes';
import { Ref, ref, watchEffect } from 'vue';
import { getQualifierCounts } from '@/services/outputdata-service';

const FETCH_BY_DEFAULT_LIMIT = 100;

const convertResponsesToAvailableQualifiers = (
  responses: QualifierCountsResponse[],
  listedQualifiers: string[]
) => {
  const availableQualifiers: Map<string, QualifierInfo> = new Map<string, QualifierInfo>();
  const maxCounts: Map<string, number> = new Map<string, number>();
  const thresholds: QualifierThresholds = {
    max_count: Infinity,
    regional_timeseries_count: Infinity,
    regional_timeseries_max_level: Infinity
  };

  // Combine qualifiers from all runs into a single list
  responses.forEach(qualifierCounts => {
    Object.entries(qualifierCounts.counts).forEach(([key, value]) => {
      // When combining multiple runs, take the max qualifier count
      const existingVal = maxCounts.get(key);
      if (!existingVal || value > existingVal) {
        maxCounts.set(key, value);
      }

      // The thresholds should be the same across all runs, but take the min just in case.
      thresholds.max_count = Math.min(thresholds.max_count,
        qualifierCounts.thresholds.max_count);
      thresholds.regional_timeseries_count = Math.min(thresholds.regional_timeseries_count,
        qualifierCounts.thresholds.regional_timeseries_count);
      thresholds.regional_timeseries_max_level = Math.min(thresholds.regional_timeseries_max_level,
        qualifierCounts.thresholds.regional_timeseries_max_level);
    });
  });

  // Filter out qualifiers not listed in the metadata and any with too many values
  // Set flags indicating whether regional timeseries are available and whether to fetch
  // the qualifier data by default.
  maxCounts.forEach((value: number, key: string) => {
    if (listedQualifiers.includes(key) && value <= thresholds.max_count) {
      const qualifier: QualifierInfo = {
        count: value,
        fetchByDefault: value <= FETCH_BY_DEFAULT_LIMIT,
        maxAdminLevelTimeseries: value <= thresholds.regional_timeseries_count
          ? thresholds.regional_timeseries_max_level
          : -1
      };
      availableQualifiers.set(key, qualifier);
    }
  });
  return availableQualifiers;
};

export default function useQualifierCounts(
  metadata: Ref<Model | Indicator | null>,
  selectedScenarioIds: Ref<string[]>,
  activeFeature: Ref<string>
) {
  const availableQualifiers = ref<Map<string, QualifierInfo>>(new Map<string, QualifierInfo>());

  watchEffect(async onInvalidate => {
    if (metadata.value === null) return;
    let isCancelled = false;
    onInvalidate(() => {
      isCancelled = true;
    });
    const { data_id } = metadata.value;
    const promises = selectedScenarioIds.value.map(runId =>
      getQualifierCounts(data_id, runId, activeFeature.value)
    );
    const { qualifier_outputs } = metadata.value;
    const listedQualifiers = (qualifier_outputs ?? []).map(variable => variable.name);
    // FIXME: OPTIMIZATION: Placing a separate request for each run eats into
    //  the maximum number of concurrent requests, resulting in closer to
    //  serial performance and slowing down other calls. We should update this
    //  endpoint to accept a list of run IDs so only one request is necessary.
    const responses = await Promise.all(promises);
    if (isCancelled) return;
    availableQualifiers.value = convertResponsesToAvailableQualifiers(
      responses,
      listedQualifiers
    );
  });

  return availableQualifiers;
}
