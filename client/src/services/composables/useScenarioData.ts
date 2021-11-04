import { ModelRun, PreGeneratedModelRunData } from '@/types/ModelRun';
import { computed, ref, Ref, watchEffect } from 'vue';
import { getModelRunMetadata } from '@/services/new-datacube-service';
import { isImage, isVideo, TAGS } from '@/utils/datacube-util';
import { DatacubeGenericAttributeVariableType, ModelRunStatus } from '@/types/Enums';
import _ from 'lodash';
import { ModelParameter } from '@/types/Datacube';
import dateFormatter from '@/formatters/date-formatter';
import { getRandomInt } from '@/utils/random';

/**
 * Takes a datacube data ID and a list of scenario IDs, then fetches and
 * returns the metadata for each scenario in one list.
 */
export default function useScenarioData(
  dataId: Ref<string | null>,
  modelRunsFetchedAt: Ref<number>,
  searchFilters: Ref<any>,
  dimensions: Ref<ModelParameter[]>
) {
  const runData = ref([]) as Ref<ModelRun[]>;

  const allModelRunData = computed(() => runData.value.filter(modelRun => modelRun.status !== ModelRunStatus.Deleted));

  const filteredRunData = computed(() => {
    let filteredRuns = runData.value.filter(modelRun => modelRun.status !== ModelRunStatus.Deleted);

    // apply search filters, if any
    // parse and apply filters to the model runs data
    if (_.isEmpty(searchFilters.value) || searchFilters.value.clauses.length === 0) {
      // do nothing; since we need to cancel existing filters, if any
    } else {
      const dimTypeMap: { [key: string]: string } = dimensions.value.reduce(
        (obj, item) => Object.assign(obj, { [item.name]: item.type }), {});
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
              if (dimTypeMap[filterField] === DatacubeGenericAttributeVariableType.Int || dimTypeMap[filterField] === DatacubeGenericAttributeVariableType.Float) {
                const filterRange = filterValues[0]; // range bill provides the filter range as array of two values within an array
                return paramsMatchingFilterField.value >= filterRange[0] && paramsMatchingFilterField.value <= filterRange[1];
              } else {
                return filterValues.includes(paramsMatchingFilterField.value.toString()) === isNot;
              }
            } else {
              // this is an output filter
              //  we need to search the array of v.output_agg_values
              // note: this will always be a numeric range
              const runOutputValue = v.output_agg_values[0].value;
              const filterRange = filterValues[0]; // range bill provides the filter range as array of two values within an array
              return runOutputValue >= filterRange[0] && runOutputValue <= filterRange[1];
            }
          }
        });
      });
    }

    if (dataId.value === '897da460-6118-4a13-9d41-38e948792cb9') { // CHIRPS
      // transform each 'month' value to be a date value for proper consumption by the temporal facet
      const numRuns = Math.trunc((filteredRuns.length / 2) + 1);
      const delimiter = '__';
      //
      // date / month
      //
      const start = new Date(2012, 0, 1);
      const end = new Date();
      const paramName = 'month';
      const dateFormat = dimensions.value.find(d => d.name === paramName)?.additional_options.date_display_format ?? 'YYYY-MM-DD';
      const randomDates: Date[] = [];
      for (let i = 0; i < numRuns; i++) {
        const newRandomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
        randomDates.push(newRandomDate);
      }
      filteredRuns.forEach(run => {
        const temporalParam = run.parameters.find(p => p.name === paramName);
        if (temporalParam) {
          temporalParam.name = 'date';
          const randIndx = getRandomInt(0, numRuns - 1);
          const newDateValue = randomDates[randIndx];
          temporalParam.value = dateFormatter(newDateValue, dateFormat);
        }
      });

      //
      // daterange / year
      //
      const start1 = new Date(2012, 0, 1);
      const end1 = new Date(2014, 0, 1);
      const start2 = new Date(2015, 0, 1);
      const end2 = new Date(2019, 0, 1);
      const paramName2 = 'year';
      const dateFormat2 = 'YYYY-MM-DD';
      const randomDatesStart: Date[] = [];
      const randomDatesEnd: Date[] = [];
      for (let i = 0; i < numRuns; i++) {
        const newRandomDate1 = new Date(start1.getTime() + Math.random() * (end1.getTime() - start1.getTime()));
        const newRandomDate2 = new Date(start2.getTime() + Math.random() * (end2.getTime() - start2.getTime()));
        randomDatesStart.push(newRandomDate1);
        randomDatesEnd.push(newRandomDate2);
      }
      filteredRuns.forEach(run => {
        const temporalParam = run.parameters.find(p => p.name === paramName2);
        if (temporalParam) {
          temporalParam.name = 'daterange';
          const randIndx = getRandomInt(0, numRuns - 1);
          const newDateValue1 = randomDatesStart[randIndx];
          const newDateValue2 = randomDatesEnd[randIndx];
          temporalParam.value = dateFormatter(newDateValue1, dateFormat2) + delimiter + dateFormatter(newDateValue2, dateFormat2);
        }
      });
    }

    return filteredRuns;
  });

  watchEffect(onInvalidate => {
    console.log('refetching scenario-data at: ' + new Date(modelRunsFetchedAt.value).toTimeString());
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
        const runStatusMap: {[key: string]: string} = {};
        existingData.forEach(r => {
          runStatusMap[r.id] = r.status;
        });
        newMetadata.forEach(r => {
          // if this is a new run, or if the exists but its status has changed, then we have new data
          if (!runStatusMap[r.id] || runStatusMap[r.id] !== r.status) {
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

  return {
    filteredRunData,
    allModelRunData
  };
}
