import { Indicator, Model, QualifierThresholds } from '@/types/Datacube';
import { QualifierCountsResponse } from '@/types/Outputdata';
import { QualifierFetchInfo } from '@/types/Datacubes';
import { Ref, ref, watchEffect } from 'vue';
import { getQualifierCounts } from '@/services/outputdata-service';

// Automatically fetch data for qualifiers with fewer than this many values.
const FETCH_BY_DEFAULT_LIMIT = 100;

const extractThresholds = (responses: QualifierCountsResponse[]) => {
  const thresholds: QualifierThresholds = {
    max_count: Infinity,
    regional_timeseries_count: Infinity,
    regional_timeseries_max_level: Infinity
  };
  // The thresholds should be the same across all runs, but take the min just in case.
  responses.forEach(response => {
    thresholds.max_count = Math.min(
      thresholds.max_count,
      response.thresholds.max_count
    );
    thresholds.regional_timeseries_count = Math.min(
      thresholds.regional_timeseries_count,
      response.thresholds.regional_timeseries_count
    );
    thresholds.regional_timeseries_max_level = Math.min(
      thresholds.regional_timeseries_max_level,
      response.thresholds.regional_timeseries_max_level
    );
  });
  return thresholds;
};

// Combine qualifiers from all runs into a single map, where the key is the
//  qualifier name and the value is the number of values in the
//  run that has the most.
const makeMapFromQualifierToCount = (responses: QualifierCountsResponse[]) => {
  const maxCounts = new Map<string, number>();
  responses.forEach(response => {
    Object.entries(response.counts).forEach(([qualifier, count]) => {
      // When combining multiple runs, take the max qualifier count
      const existingVal = maxCounts.get(qualifier);
      if (!existingVal || count > existingVal) {
        maxCounts.set(qualifier, count);
      }
    });
  });
  return maxCounts;
};

const calculateFetchInfoMap = (
  qualifierNames: string[],
  qualifierValueCounts: Map<string, number>,
  thresholds: QualifierThresholds
) => {
  const fetchInfoMap = new Map<string, QualifierFetchInfo>();
  [...qualifierValueCounts.entries()]
    // Filter out qualifiers not listed in the metadata
    .filter(([qualifierName]) => {
      return qualifierNames.includes(qualifierName);
    })
    // Filter out any with too many values
    .filter(([, count]) => count <= thresholds.max_count)
    // Set flags indicating whether regional timeseries are available and
    //  whether to fetch the qualifier data by default.
    .forEach(([qualifierName, count]) => {
      const fetchInfo: QualifierFetchInfo = {
        count,
        shouldFetchByDefault: count <= FETCH_BY_DEFAULT_LIMIT,
        maxAdminLevelWithRegionalTimeseries:
          count <= thresholds.regional_timeseries_count
            ? thresholds.regional_timeseries_max_level
            : -1,
        thresholds
      };
      fetchInfoMap.set(qualifierName, fetchInfo);
    });
  return fetchInfoMap;
};

export default function useQualifierFetchInfo(
  metadata: Ref<Model | Indicator | null>,
  selectedScenarioIds: Ref<string[]>,
  activeFeature: Ref<string>
) {
  const qualifierFetchInfo = ref(new Map<string, QualifierFetchInfo>());

  watchEffect(async onInvalidate => {
    // Fetch the counts for each value of each qualifier variable
    if (metadata.value === null) return;
    let isCancelled = false;
    onInvalidate(() => {
      isCancelled = true;
    });
    const { data_id, qualifier_outputs } = metadata.value;
    const promises = selectedScenarioIds.value.map(runId =>
      getQualifierCounts(data_id, runId, activeFeature.value)
    );
    // FIXME: OPTIMIZATION: Placing a separate request for each run eats into
    //  the maximum number of concurrent requests, resulting in closer to
    //  serial performance and slowing down other calls. We should update this
    //  endpoint to accept a list of run IDs so only one request is necessary.
    const responses = await Promise.all(promises);
    if (isCancelled) return;
    const qualifierNames = (qualifier_outputs ?? []).map(
      variable => variable.name
    );

    // For each qualifier, we need to determine:
    //  - Should we fetch all of it's data right away?
    //  - Should we allow the analyst to select regional data at all?
    //  - If so, which is the lowest admin level for which we have regional data?
    const thresholds = extractThresholds(responses);
    const qualifierValueCounts = makeMapFromQualifierToCount(responses);
    qualifierFetchInfo.value = calculateFetchInfoMap(
      qualifierNames,
      qualifierValueCounts,
      thresholds
    );
  });

  return qualifierFetchInfo;
}
