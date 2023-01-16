import _ from 'lodash';
import { Ref, ref, watch, computed } from 'vue';
import { IndexAnalysisState } from '@/types/Analysis';
import { getAnalysis, saveAnalysisState } from '../analysis-service';
import { createIndexAnalysisObject } from '../analysis-service-new';

// Mock data
import { OutputIndex } from '@/types/Index';
export const mockData: OutputIndex = {
  type: 'OutputIndex',
  name: 'Overall Priority',
  inputs: [
    {
      type: 'Index',
      name: 'Highest risk of drought',
      weight: 20,
      inputs: [
        {
          type: 'Dataset',
          name: 'Greatest Recent Temperature Increase',
          weight: 100,
          datasetId: 'b935f602-30b2-48bc-bdc8-10351bbffa67',
          datasetName: 'Palmer Drought Severity Index (PDSI)',
          isInverted: false,
          source: 'TerraClimate',
        },
      ],
    },
    {
      type: 'Index',
      name: 'Highest risk of conflict',
      weight: 10,
      inputs: [
        {
          type: 'Dataset',
          name: 'Greatest Recent Temperature Increase',
          weight: 90,
          datasetId: 'b935f602-30b2-48bc-bdc8-10351bbffa67',
          datasetName: 'Palmer Drought Severity Index (PDSI)',
          isInverted: false,
          source: 'TerraClimate',
        },
        {
          type: 'Dataset',
          name: 'Displaced Persons Index',
          weight: 10,
          datasetId: 'd7f69937-060d-44e8-8a04-22070ce35b27',
          datasetName: 'Displaced Persons Index',
          isInverted: false,
          source: 'XY University',
        },
      ],
    },
    {
      type: 'Dataset',
      name: 'Highest Risk of Flooding',
      weight: 10,
      datasetId: 'd7f69937-060d-44e8-8a04-22070ce35b27',
      datasetName: 'flooding dataset',
      isInverted: true,
      source: 'XY University',
    },
    {
      type: 'Index',
      name: 'Largest vulnerable population',
      weight: 60,
      inputs: [
        {
          type: 'Dataset',
          name: 'Highest poverty index ranking',
          weight: 80,
          datasetId: 'b935f602-30b2-48bc-bdc8-10351bbffa67',
          datasetName: 'Poverty indicator index',
          isInverted: false,
          source: 'UN',
        },
        {
          type: 'Dataset',
          name: 'World Population By Country',
          weight: 20,
          datasetId: 'd7f69937-060d-44e8-8a04-22070ce35b27',
          datasetName: 'World Population By Country',
          isInverted: false,
          source: 'UN',
        },
      ],
    },
  ],
};

// Whenever a change is made, wait SYNC_DELAY_MS before saving to the backend to
//  group requests together.
const SYNC_DELAY_MS = 500;

const _saveState = _.debounce((analysisId, state: IndexAnalysisState) => {
  saveAnalysisState(analysisId, state);
}, SYNC_DELAY_MS);

export default function useIndexAnalysis(analysisId: Ref<string>) {
  const analysisName = ref('');
  const analysisState = ref<IndexAnalysisState>(createIndexAnalysisObject());

  // Whenever analysisId changes, fetch the state for that analysis
  watch(analysisId, async () => {
    if (!analysisId.value) return;
    const analysis = await getAnalysis(analysisId.value);
    analysisName.value = analysis.title;
    analysisState.value = analysis.state || {};
  });

  // const indexTree = computed(() => analysisState.value.index)
  const indexTree = computed(() => mockData);

  return {
    analysisName,
    analysisState,
    indexTree,
  };
}
