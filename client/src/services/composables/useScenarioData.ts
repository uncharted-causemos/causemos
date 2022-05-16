import { ModelRun, PreGeneratedModelRunData } from '@/types/ModelRun';
import { computed, onMounted, onUnmounted, ref, Ref, watchEffect } from 'vue';
import { getModelRunMetadata } from '@/services/new-datacube-service';
import { getAggregationKey, isImage, isVideo, isWebContent, TAGS, isCategoricalAxis } from '@/utils/datacube-util';
import { AggregationOption, ModelRunStatus } from '@/types/Enums';
import _ from 'lodash';
import { ModelParameter } from '@/types/Datacube';
import { Filters } from '@/types/Filters';

const FETCH_INTERVAL_SECONDS = 20;

/**
 * Takes a datacube data ID and a list of scenario IDs, then fetches and
 * returns the metadata for each scenario in one list. Checks for updates every
 * `FETCH_INTERVAL_SECONDS` if `isRefreshingPeriodically`.
 */
export default function useScenarioData(
  dataId: Ref<string | null>,
  searchFilters: Ref<Filters>,
  dimensions: Ref<ModelParameter[]>,
  isRefreshingPeriodically: Ref<boolean>
) {
  const runData = ref([]) as Ref<ModelRun[]>;

  const allModelRunData = computed(() => runData.value
    .filter(modelRun => modelRun.status !== ModelRunStatus.Deleted && modelRun.status !== ModelRunStatus.Test)
    .map(modelRun => { return { ...modelRun, _version: undefined }; }));

  const filteredRunData = computed(() => {
    let filteredRuns = allModelRunData.value;

    // parse and apply filters, if any, to the model runs data
    if (searchFilters.value.clauses.length === 0) {
      // do nothing; since we need to cancel existing filters, if any
      return filteredRuns;
    }
    // a map that indicates whether each param is categorical or not
    const dimTypeMap: { [key: string]: string } = dimensions.value.reduce(
      (obj, item) => Object.assign(obj, { [item.name]: isCategoricalAxis(item.name, dimensions.value) }), {});
    const clauses = searchFilters.value.clauses;
    clauses.forEach((c: any) => {
      const filterField: string = c.field; // the field to filter on
      const filterValues = c.values; // array of values to filter upon
      const isNot = !c.isNot; // is the filter reversed?
      filteredRuns = filteredRuns.filter(v => {
        if (filterField === TAGS) {
          // special search, e.g. by keyword or tags
          return v.tags && v.tags.length > 0 && filterValues.some((val: string) => v.tags.includes(val) === isNot);
        } else {
          // direct query against parameters or output features
          const paramsMatchingFilterField = v.parameters.find(p => p.name === filterField);
          if (paramsMatchingFilterField !== undefined) {
            // this is a param filter
            // so we can search this parameters array directly
            //  depending on the param type, we could have range (e.g., rainful multiplier range) or a set of values (e.g., one or more selected countries)
            if (!dimTypeMap[filterField]) {
              const filterRange = filterValues[0]; // range bill provides the filter range as array of two values within an array
              return paramsMatchingFilterField.value >= filterRange[0] && paramsMatchingFilterField.value <= filterRange[1];
            } else {
              return filterValues.includes(paramsMatchingFilterField.value.toString()) === isNot;
            }
          } else {
            // this is an output filter
            //  we need to search the array of v.output_agg_values
            // note: this will always be a numeric range
            // TODO: This needs to depend on the selected aggregation functions
            const aggKey = getAggregationKey(AggregationOption.Mean, AggregationOption.Mean);
            const outputValue = v.output_agg_values.find(val => val.name === filterField);
            const runOutputValue = (outputValue && outputValue[aggKey]) ?? NaN;
            const filterRange = filterValues[0]; // range bill provides the filter range as array of two values within an array
            return runOutputValue >= filterRange[0] && runOutputValue <= filterRange[1];
          }
        }
      });
    });
    return filteredRuns;
  });


  const modelRunsFetchedAt = ref(0);
  const fetchModelRuns = () => {
    modelRunsFetchedAt.value = Date.now();
  };
  watchEffect(onInvalidate => {
    // This condition should always return true, it's just used to add
    //  modelRunsFetchedAt to this watchEffect's dependency array
    if (modelRunsFetchedAt.value < 0) { return; }
    let isCancelled = false;
    async function fetchRunData() {
      if (dataId.value === null) return;
      const newMetadata = await getModelRunMetadata(dataId.value);
      if (isCancelled) {
        // Dependencies have changed since the fetch started, so ignore the
        //  fetch results to avoid a race condition.
        return;
      }
      //
      // only reset if new data is different from existing data
      //
      const existingData = runData.value;
      let newDataIsDifferent = false;
      if (existingData.length !== newMetadata.length) {
        newDataIsDifferent = true;
      } else {
        // we need to compare run status
        const runVersionMap: {[key: string]: number} = {};
        existingData.forEach(r => {
          runVersionMap[r.id] = r._version ?? 0;
        });
        newMetadata.forEach(r => {
          // if this is a new run, or if the exists but its _version has changed, then we have new data
          if (!runVersionMap[r.id] || runVersionMap[r.id] !== r._version) {
            newDataIsDifferent = true;
          }
        });
      }
      if (newDataIsDifferent) {
        newMetadata.forEach(run => {
          /*
          //
          // @TEMP: EXAMPLE OF PRE-GEN DATA WITH TIMESTAMP AND GEO
          //
          if (run.pre_gen_output_paths === null) {
            const preRenderedData: PreGeneratedModelRunData[] = [
              {
                file: 'https://docs.mapbox.com/mapbox-gl-js/assets/radar.gif',
                type: 'image',
                target: 'map',
                timestamp: 1609459200000, // from MaxHop
                // example for Ethiopia
                coords: [
                  // top-left
                  {
                    lat: 12.1, long: 30.4
                  },
                  // bottom-right
                  {
                    lat: 3.1, long: 48.1
                  }
                ]
              },
              {
                file: 'https://docs.mapbox.com/mapbox-gl-js/assets/cat.png',
                timestamp: 1609459200000, // from MaxHop
                type: 'image'
              }
            ];
            run.pre_gen_output_paths = preRenderedData;
          }
          */

          //
          // attempt to annotate each pre-rendered resource type
          //  (ideally, this would be done at dojo side)
          //
          if (run.pre_gen_output_paths) {
            (run.pre_gen_output_paths as PreGeneratedModelRunData[]).forEach(pregen => {
              if (pregen.type === undefined) {
                if (isImage(pregen.file)) {
                  pregen.type = 'image';
                }
                if (isVideo(pregen.file)) {
                  pregen.type = 'video';
                }
                if (isWebContent(pregen.file)) {
                  pregen.type = 'web';
                }
              }
            });
          }
        });

        runData.value = newMetadata;
      }
    }
    onInvalidate(() => {
      isCancelled = true;
    });
    fetchRunData();
  });

  // Refetch model runs every FETCH_INTERVAL_SECONDS.
  // isSuppressingFetches is still respected.
  let timerHandler: number | null = null;
  onMounted(() => {
    timerHandler = window.setInterval(
      () => {
        if (isRefreshingPeriodically.value) {
          fetchModelRuns();
        }
      },
      FETCH_INTERVAL_SECONDS * 1000
    );
  });
  onUnmounted(() => {
    window.clearInterval(timerHandler as number);
  });

  return {
    fetchModelRuns,
    filteredRunData,
    allModelRunData
  };
}
