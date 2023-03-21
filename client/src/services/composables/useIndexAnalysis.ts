import _ from 'lodash';
import { Ref, ref, watch, readonly, computed } from 'vue';
import { IndexAnalysisState } from '@/types/Analysis';
import { getAnalysis, saveAnalysisState } from '../analysis-service';
import { createIndexAnalysisObject } from '../analysis-service-new';

import useIndexWorkBench from '@/services/composables/useIndexWorkBench';
import useIndexTree from '@/services/composables/useIndexTree';
import { IndexResultsSettings } from '@/types/Index';

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
      _analysisState.value = {
        ..._analysisState.value,
        index: indexTree.tree.value,
        workBench: workbench.items.value,
      };
      _saveState(workbenchAnalysisId, _analysisState.value);
    }
  });

  // Check current analysis state loaded in the memory is synced with the one from the server.
  // Since _saveState is fired asynchronously and we don't wait for the response, and also the Elastic Search operations are not atomic and index could takes a bit of time to get refreshed
  // and be available for search with newly inserted or updated document, there might be a chance that the analysis state from the server is not yet updated and the changes in _analysisState is not fully reflected yet.
  // This issue might cause a race condition in some cases (e.g. navigating to different page immediately after saving the analysis state) and to avoid, we need a method to check whether the data in the server is synced with the current _analysisState.
  // isStateInSync if the analysis state from the server is in sync with _analysisState
  const isStateInSync = async () => {
    const analysis = await getAnalysis(analysisId.value);
    return _.isEqual(analysis.state, _analysisState.value);
  };

  const waitForStateInSync = async (retry = 10, waitTimeout = 500) => {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    for (let index = 0; index < retry; index++) {
      await sleep(waitTimeout);
      const isSync = await isStateInSync();
      if (isSync) return;
    }
    throw new Error('waitForStateInSync has timed out');
  };

  // Index results settings

  const indexResultsSettings = computed(() => _analysisState.value.resultsSettings);

  const saveIndexResultsSettings = (config: IndexResultsSettings) => {
    _analysisState.value = {
      ..._analysisState.value,
      resultsSettings: config,
    };
    _saveState(analysisId, _analysisState.value);
  };

  return {
    analysisName,
    indexResultsSettings,
    saveIndexResultsSettings,
    refresh: fetchAnalysis,
    waitForStateInSync,
  };
}
