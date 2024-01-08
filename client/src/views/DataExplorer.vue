<template>
  <DataExplorer
    :nav-back-label="navBackLabel"
    :complete-button-label="SELECT_LABEL"
    :enable-multiple-selection="true"
    :initial-selection="selectedDatacubes"
    @close="onClose"
    @complete="addToAnalysis"
  />
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import { useRoute } from 'vue-router';

import router from '@/router';

import { Datacube } from '@/types/Datacube';
import { TYPE } from 'vue-toastification';
import { DataAnalysisState } from '@/types/Analysis';

import DataExplorer from '../components/data-explorer/data-explorer.vue';

import useToaster from '@/composables/useToaster';
import { useDataAnalysis } from '@/composables/useDataAnalysis';

import { ANALYSIS } from '@/utils/messages-util';
import {
  createNewAnalysisItem,
  getDatacubeId,
  MAX_ANALYSIS_DATACUBES_COUNT,
} from '@/utils/analysis-util';

import { getDatacubesByIds } from '@/services/datacube-service';
import {
  saveAnalysisState,
  calculateResetRegionRankingWeights,
  didSelectedItemsChange,
} from '@/services/analysis-service';

const SELECT_LABEL = 'Add To Analysis';

const toaster = useToaster();
const route = useRoute();
const analysisId = computed(() => route.params.analysisId as string);

const { analysisName, analysisState, analysisItems } = useDataAnalysis(analysisId);

const navBackLabel = computed(() => `Back to ${analysisName.value || 'analysis'}`);

const selectedDatacubes = ref<Datacube[]>([]);
watch(analysisItems, async () => {
  const ids = analysisItems.value.map((item) => getDatacubeId(item));
  if (ids.length > 0) {
    selectedDatacubes.value = await getDatacubesByIds(ids);
  }
});

// Find existing analysis item with same id and check if that item is visible(selected) item
const isAnalysisItemVisible = (id: string) =>
  Boolean(analysisItems.value.find((item) => getDatacubeId(item) === id)?.selected);

const addToAnalysis = async (selectedDatacubes: Datacube[]) => {
  try {
    const newAnalysisItems = selectedDatacubes.map((datacube) =>
      createNewAnalysisItem(datacube.id, datacube.default_state, isAnalysisItemVisible(datacube.id))
    );
    let visibleDatacubeCount = newAnalysisItems.filter((item) => item.selected).length;
    // If visibleDatacubeCount is less than MAX_ANALYSIS_DATACUBES_COUNT, make more datacubes visible.
    newAnalysisItems
      .filter((item) => !item.selected)
      .forEach((item) => {
        if (visibleDatacubeCount < MAX_ANALYSIS_DATACUBES_COUNT) {
          item.selected = true;
          visibleDatacubeCount += 1;
        }
      });

    // Save updated list of analysisItems to the backend
    const newState: DataAnalysisState = {
      ...analysisState.value,
      analysisItems: newAnalysisItems,
    };
    // If the list of selected datacubes changed, reset region ranking
    //  weights.
    const shouldResetWeights = didSelectedItemsChange(analysisItems.value, newAnalysisItems);
    if (shouldResetWeights) {
      newState.regionRankingItemStates = calculateResetRegionRankingWeights(
        newAnalysisItems,
        newState.regionRankingItemStates
      );
    }
    await saveAnalysisState(analysisId.value, newState);
    router.push({
      name: 'dataComparative',
      params: {
        project: route.params.project,
        analysisId: route.params.analysisId,
        projectType: route.params.projectType,
      },
    });
  } catch (e) {
    toaster(ANALYSIS.ERRONEOUS_RENAME, TYPE.INFO, true);
  }
};

const onClose = () => {
  router.push({
    name: 'dataComparative',
    params: {
      projectType: route.params.projectType,
      project: route.params.project,
      analysisId: route.params.analysisId,
    },
  });
};
</script>

<style lang="scss" scoped></style>
