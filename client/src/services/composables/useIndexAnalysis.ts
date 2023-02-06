import _ from 'lodash';
import { Ref, ref, watch, readonly } from 'vue';
import { IndexAnalysisState } from '@/types/Analysis';
import { getAnalysis, saveAnalysisState } from '../analysis-service';
import { createIndexAnalysisObject } from '../analysis-service-new';

import useIndexWorkBench from '@/services/composables/useIndexWorkBench';
import useIndexTree from '@/services/composables/useIndexTree';

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
    // ensure default values
    _analysisState.value = { ...createIndexAnalysisObject(), ...analysis.state };
    // Initialize workbench items and the index tree
    workbench.initialize(analysisId.value, _analysisState.value.workBench);
    indexTree.initialize(analysisId.value, _analysisState.value.index);
  };
  // Whenever analysisId changes, fetch the state for that analysis
  watch(analysisId, fetchAnalysis);

  const analysisName = readonly(_analysisName);

  // Update and save the state whenever items are updated
  watch([workbench.items, indexTree.tree], () => {
    const workbenchAnalysisId = workbench.getAnalysisId();
    const indexTreeAnalysisId = indexTree.getAnalysisId();
    if (workbenchAnalysisId === analysisId.value && workbenchAnalysisId === indexTreeAnalysisId) {
      const state: IndexAnalysisState = {
        index: indexTree.tree.value,
        workBench: workbench.items.value,
      };
      _saveState(workbenchAnalysisId, state);
    }
  });

  return {
    analysisName,
    refresh: fetchAnalysis,
  };
}
