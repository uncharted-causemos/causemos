import _ from 'lodash';
import { Ref, ref, watch, readonly } from 'vue';
import { IndexAnalysisState } from '@/types/Analysis';
import { getAnalysis, saveAnalysisState } from '../analysis-service';
import { createIndexAnalysisObject } from '../analysis-service-new';

// Mock data
import { OutputIndex } from '@/types/Index';
import { IndexNodeType } from '@/types/Enums';
import useIndexWorkBench from '@/services/composables/useIndexWorkBench';
import useIndexTree from '@/services/composables/useIndexTree';

const mockData = (): OutputIndex => ({
  id: '6e4adcee-c3af-4696-b84c-ee1169adcd4c',
  type: IndexNodeType.OutputIndex,
  name: 'Overall Priority',
  inputs: [
    {
      id: '5ad78cb0-b923-48ef-9c1a-31219987ca16',
      type: IndexNodeType.Index,
      name: 'Highest risk of drought',
      weight: 20,
      isWeightUserSpecified: true,
      inputs: [
        {
          id: 'a547b59f-9287-4991-a817-08ba54a0353f',
          type: IndexNodeType.Placeholder,
          name: 'Greatest reliance on fragile crops',
        },
        {
          id: 'e547b59f-9287-4991-a817-08ba54a0353c',
          type: IndexNodeType.Dataset,
          name: 'Greatest Recent Temperature Increase',
          weight: 100,
          isWeightUserSpecified: true,
          datasetId: 'b935f602-30b2-48bc-bdc8-10351bbffa67',
          datasetName: 'Palmer Drought Severity Index (PDSI)',
          selectedTimestamp: 0,
          isInverted: false,
          source: 'TerraClimate',
        },
      ],
    },
    {
      id: 'd25a7418-3b86-4b2d-bdac-4f6ecb61563c',
      type: IndexNodeType.Index,
      name: 'Highest risk of conflict',
      weight: 10,
      isWeightUserSpecified: true,
      inputs: [
        {
          id: '0265ae5a-6bec-4335-b879-1ed2f58e9235',
          type: IndexNodeType.Dataset,
          name: 'Greatest Recent Temperature Increase',
          weight: 90,
          isWeightUserSpecified: true,
          datasetId: 'b935f602-30b2-48bc-bdc8-10351bbffa67',
          datasetName: 'Palmer Drought Severity Index (PDSI)',
          selectedTimestamp: 0,
          isInverted: false,
          source: 'TerraClimate',
        },
        {
          id: '05f63ec3-240c-4d6e-b641-b7d2321f8b2e',
          type: IndexNodeType.Dataset,
          name: 'Displaced Persons Index',
          weight: 10,
          isWeightUserSpecified: true,
          datasetId: 'd7f69937-060d-44e8-8a04-22070ce35b27',
          datasetName: 'Displaced Persons Index',
          selectedTimestamp: 0,
          isInverted: false,
          source: 'XY University',
        },
      ],
    },
    {
      id: '761fa7aa-05ea-4e51-bba7-49c37f8d8728',
      type: IndexNodeType.Dataset,
      name: 'Highest Risk of Flooding',
      weight: 10,
      isWeightUserSpecified: true,
      datasetId: 'd7f69937-060d-44e8-8a04-22070ce35b27',
      datasetName: 'flooding dataset',
      selectedTimestamp: 0,
      isInverted: true,
      source: 'XY University',
    },
    {
      id: '6db6284d-7879-4735-a460-5f2b273c0bf9',
      type: IndexNodeType.Index,
      name: 'Largest vulnerable population',
      weight: 60,
      isWeightUserSpecified: true,
      inputs: [
        {
          id: '16caf563-548f-4e11-a488-a900f0d01c3b',
          type: IndexNodeType.Dataset,
          name: 'Highest poverty index ranking',
          weight: 80,
          isWeightUserSpecified: true,
          datasetId: 'b935f602-30b2-48bc-bdc8-10351bbffa67',
          datasetName: 'Poverty indicator index',
          selectedTimestamp: 0,
          isInverted: false,
          source: 'UN',
        },
        {
          id: 'cd24e111-b186-4eaa-8885-94bc44920cb1',
          type: IndexNodeType.Dataset,
          name: 'World Population By Country',
          weight: 20,
          isWeightUserSpecified: true,
          datasetId: 'd7f69937-060d-44e8-8a04-22070ce35b27',
          datasetName: 'World Population By Country',
          selectedTimestamp: 0,
          isInverted: false,
          source: 'UN',
        },
        {
          id: '2f624d92-efa0-431a-a3a1-5521871420ad',
          type: IndexNodeType.Index,
          name: 'Population Health',
          weight: 0,
          isWeightUserSpecified: true,
          inputs: [
            {
              id: 'd851ac5d-2de2-475d-8ef7-5bd46a1a9016',
              type: IndexNodeType.Dataset,
              name: 'Malnutrition',
              weight: 80,
              isWeightUserSpecified: true,
              datasetId: 'b935f602-30b2-48bc-bdc8-10351bbffa67',
              datasetName: 'Malnutrition rates dataset',
              selectedTimestamp: 0,
              isInverted: false,
              source: 'UN',
            },
            {
              id: 'ac56ea0f-3ca9-4aee-9c06-f98768b7bd2a',
              type: IndexNodeType.Dataset,
              name: 'Life expectancy by country',
              weight: 20,
              isWeightUserSpecified: true,
              datasetId: 'd7f69937-060d-44e8-8a04-22070ce35b27',
              datasetName: 'Life expectancy by country',
              selectedTimestamp: 0,
              isInverted: false,
              source: 'UN',
            },
          ],
        },
      ],
    },
  ],
});

// Whenever a change is made, wait SYNC_DELAY_MS before saving to the backend to
//  group requests together.
const SYNC_DELAY_MS = 500;

const _saveState = _.debounce((analysisId, state: IndexAnalysisState) => {
  saveAnalysisState(analysisId, state);
}, SYNC_DELAY_MS);

export default function useIndexAnalysis(analysisId: Ref<string>) {
  // place for temporally storing detached tree/nodes that are being worked on
  const workbench = useIndexWorkBench();
  // primary upstream index tree
  const indexTree = useIndexTree();

  const _analysisState = ref<IndexAnalysisState>(createIndexAnalysisObject());
  const _analysisName = ref('');

  const fetchAnalysis = async () => {
    if (!analysisId.value) return;
    const analysis = await getAnalysis(analysisId.value);
    _analysisName.value = analysis.title;
    _analysisState.value = { ...analysis.state, ...createIndexAnalysisObject() }; // ensure default values
    // Init workbench items and the index tree
    workbench.initialize(analysisId.value, _analysisState.value.workBench);
    // indexTree.init(analysisId.value, _analysisState.value.index);
    // FIXME: remove mock data when ready
    indexTree.initialize(analysisId.value, mockData());
  };
  // Whenever analysisId changes, fetch the state for that analysis
  watch(analysisId, fetchAnalysis);

  const analysisName = readonly(_analysisName);

  watch(workbench.items, () => {
    const aid = workbench.getAnalysisId();
    if (aid === analysisId.value) {
      // Update and save the state whenever items are updated
      // Not Yet Implemented
    }
  });

  return {
    analysisName,
    refresh: fetchAnalysis,
  };
}
