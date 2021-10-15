import { ModelRun, PreGeneratedModelRunData } from '@/types/ModelRun';
import { computed, ref, Ref, watchEffect } from 'vue';
import { getModelRunMetadata } from '@/services/new-datacube-service';
import { isImage, isVideo } from '@/utils/datacube-util';
import { ModelRunStatus } from '@/types/Enums';


/**
 * Takes a datacube data ID and a list of scenario IDs, then fetches and
 * returns the metadata for each scenario in one list.
 */
export default function useScenarioData(
  dataId: Ref<string | null>,
  modelRunsFetchedAt: Ref<number>
) {
  const runData = ref([]) as Ref<ModelRun[]>;
  const filteredRunData = computed(() => runData.value.filter(modelRun => modelRun.status !== ModelRunStatus.Deleted));

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

  return filteredRunData;
}
