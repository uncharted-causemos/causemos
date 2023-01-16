import _ from 'lodash';
import { Ref, ref, watch, computed } from 'vue';
import { IndexAnalysisState } from '@/types/Analysis';
import { getAnalysis, saveAnalysisState } from '../analysis-service';
import { createIndexAnalysisObject } from '../analysis-service-new';

// Mock data
import { mockData } from '@/types/Index';

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
