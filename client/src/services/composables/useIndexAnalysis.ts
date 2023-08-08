import _ from 'lodash';
import { Ref, ref, watch, readonly, computed } from 'vue';
import { CountryFilter, IndexAnalysisState } from '@/types/Analysis';
import { getAnalysis, saveAnalysisState } from '../analysis-service';
import { createIndexAnalysisObject } from '../analysis-service-new';

import useIndexWorkBench from '@/services/composables/useIndexWorkBench';
import useIndexTree from '@/services/composables/useIndexTree';
import { IndexProjectionSettings, IndexResultsSettings } from '@/types/Index';

// Whenever a change is made, wait SYNC_DELAY_MS before saving to the backend to
//  group requests together.
const SYNC_DELAY_MS = 500;

const _saveState = _.debounce((analysisId: string, state: IndexAnalysisState) => {
  saveAnalysisState(analysisId, state);
}, SYNC_DELAY_MS);

export default function useIndexAnalysis(analysisId: Ref<string>) {
  // place for temporally storing detached tree/nodes that are being worked on
  const workbench = useIndexWorkBench();
  // primary upstream index tree
  const indexTree = useIndexTree();

  const _analysisState = ref<IndexAnalysisState>(createIndexAnalysisObject());
  const _analysisName = ref('');

  const isDeprecatedDataStructure = ref(true);
  watch([analysisId], () => {
    // Assume the analysis uses the deprecated data structure until we can confirm that it doesn't.
    isDeprecatedDataStructure.value = true;
  });

  const fetchAnalysis = async () => {
    if (!analysisId.value) return;
    const analysis = await getAnalysis(analysisId.value);
    _analysisName.value = analysis.title;

    if (analysis.state?.index?.type !== undefined) {
      // This analysis uses the deprecated data structure.
      console.log(
        'This analysis uses a deprecated data structure and cannot be viewed or modified.'
      );
      return;
    } else {
      isDeprecatedDataStructure.value = false;
    }

    // ensure default values
    const defaults = createIndexAnalysisObject();
    _analysisState.value = {
      ...defaults,
      ...analysis.state,
      // For settings object, copy properties from one level deeper
      resultsSettings: { ...defaults.resultsSettings, ...analysis.state.resultsSettings },
      projectionSettings: { ...defaults.projectionSettings, ...analysis.state.projectionSettings },
    };
    // Initialize workbench items and the index tree
    workbench.initialize(analysisId.value, _analysisState.value.workBench);
    indexTree.initialize(analysisId.value, _analysisState.value.index);
  };
  // Whenever analysisId changes, fetch the state for that analysis
  watch(analysisId, fetchAnalysis);

  const analysisName = readonly(_analysisName);

  // Update and save the state whenever items are updated
  watch([workbench.items, indexTree.tree], () => {
    if (isDeprecatedDataStructure.value) {
      // Don't update the backend if the data structure is deprecated
      console.log('Not updating backend because this analysis uses a deprecated data structure.');
      return;
    }
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

  /**
   * Check if the current analysis state loaded in the memory is synced with the one from the server.
   * The _saveState function is fired asynchronously, and we do not wait for the response. Additionally,
   * the Elastic Search operations are not atomic and the index could take some time to refresh, making it unavailable
   * for search with newly inserted or updated documents briefly. As a result, there may be a brief moment where the analysis
   * state from the server is not yet updated and the changes in _analysisState are not fully reflected.
   * This issue can cause a race condition in some cases (e.g. navigating to a different page immediately after
   * saving the analysis state). To prevent this issue, we need a method to check whether the data in the server is synced
   * with the current _analysisState. The function isStateInSync checks whether the analysis state from the server
   * is in sync with _analysisState.
   */
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

  const updateIndexResultsSettings = (config: Partial<IndexResultsSettings>) => {
    _analysisState.value = {
      ..._analysisState.value,
      resultsSettings: { ..._analysisState.value.resultsSettings, ...config },
    };
    _saveState(analysisId.value, _analysisState.value);
  };

  // index projection settings

  const indexProjectionSettings = computed(() => _analysisState.value.projectionSettings);

  const updateIndexProjectionSettings = (settings: Partial<IndexProjectionSettings>) => {
    _analysisState.value = {
      ..._analysisState.value,
      projectionSettings: { ..._analysisState.value.projectionSettings, ...settings },
    };
    _saveState(analysisId.value, _analysisState.value);
  };

  const deleteCountryFilter = (filterToDelete: CountryFilter) => {
    _analysisState.value = {
      ..._analysisState.value,
      countryFilters: _analysisState.value.countryFilters.filter(
        (item: CountryFilter) => item.countryName !== filterToDelete.countryName
      ),
    };
    _saveState(analysisId.value, _analysisState.value);
  };

  const addCountryFilter = (update: CountryFilter) => {
    _analysisState.value = {
      ..._analysisState.value,
      countryFilters: [..._analysisState.value.countryFilters, update],
    };
    _saveState(analysisId.value, _analysisState.value);
  };

  const updateCountryFilter = (update: CountryFilter) => {
    const filters = [..._analysisState.value.countryFilters];
    const index = filters.findIndex((filter) => filter.countryName === update.countryName);
    if (index >= 0) {
      filters[index].active = update.active;
    }
    _analysisState.value.countryFilters = filters;
    _saveState(analysisId.value, _analysisState.value);
  };

  const getCountryFilters = () => {
    return _analysisState.value.countryFilters;
  };

  return {
    addCountryFilter,
    analysisName,
    deleteCountryFilter,
    getCountryFilters,
    indexResultsSettings,
    indexProjectionSettings,
    updateCountryFilter,
    updateIndexResultsSettings,
    updateIndexProjectionSettings,
    refresh: fetchAnalysis,
    waitForStateInSync,
  };
}
