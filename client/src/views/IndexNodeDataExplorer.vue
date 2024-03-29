<template>
  <DataExplorer
    :nav-back-label="navBackLabel"
    :complete-button-label="selectButtonLabel"
    :enable-multiple-selection="false"
    :facet-fields="facetFields"
    :omit-model-datacubes="true"
    @close="navigateBackToIndexStructure"
    @complete="handleSelection"
  />
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { TYPE } from 'vue-toastification';

import { Datacube } from '@/types/Datacube';
import { DatasetSearchResult } from '@/types/Index';

import router from '@/router';

import DataExplorer from '../components/data-explorer/data-explorer.vue';

import useIndexWorkBench from '@/composables/useIndexWorkBench';
import useIndexTree from '@/composables/useIndexTree';
import useIndexAnalysis from '@/composables/useIndexAnalysis';
import useToaster from '@/composables/useToaster';
import useOverlay from '@/composables/useOverlay';

import { getOutput, FACET_FIELDS, TYPE as FACET_FIELD_TYPE } from '@/utils/datacube-util';
import { capitalizeEachWord } from '@/utils/string-util';

// Omit datacube type facet field since we are restricting the datacube explorer to only show indicator datacube
const OMITTED_FACET_FIELDS = [FACET_FIELD_TYPE];
const facetFields = FACET_FIELDS.filter((field) => !OMITTED_FACET_FIELDS.includes(field));

const selectButtonLabel = 'Add Dataset';

const route = useRoute();
const toaster = useToaster();
const overlay = useOverlay();

// Load and initialize the index analysis state for given analysis id
const { waitForStateInSync, refresh, analysisName } = useIndexAnalysis(
  computed(() => route.params.analysisId as string)
);
const workBench = useIndexWorkBench();
const indexTree = useIndexTree();

const navBackLabel = computed(() => `Back to ${analysisName.value}`);

onMounted(async () => await refresh());

const convertDatacubeToDatasetSearchResult = (datacube: Datacube): DatasetSearchResult | null => {
  const defaultOutput = getOutput(datacube, datacube.default_feature);
  if (!defaultOutput || !defaultOutput.name) return null;
  const displayName = defaultOutput.display_name || capitalizeEachWord(defaultOutput.name);
  return {
    displayName,
    dataId: datacube.data_id,
    description: defaultOutput.description,
    familyName: datacube.family_name,
    outputName: defaultOutput.name,
  };
};

const navigateBackToIndexStructure = () => {
  router.replace({
    name: 'indexStructure',
    params: {
      projectType: route.params.projectType,
      project: route.params.project,
      analysisId: route.params.analysisId,
    },
  });
};

const handleSelection = async (selectedDatacubes: Datacube[]) => {
  if (!selectedDatacubes.length) return;
  const dataset = convertDatacubeToDatasetSearchResult(selectedDatacubes[0]);
  if (!dataset)
    return toaster('Selected dataset is invalid or is missing metadata', TYPE.ERROR, false);
  overlay.enable();
  try {
    await Promise.all([
      workBench.attachDatasetToNode(route.params.nodeId as string, dataset, dataset.displayName),
      indexTree.attachDatasetToNode(route.params.nodeId as string, dataset, dataset.displayName),
    ]);
    await waitForStateInSync();
  } catch (e) {
    toaster(
      'Unexpected error happened while adding the selected dataset to index node',
      TYPE.ERROR,
      false
    );
  }
  overlay.disable();
  navigateBackToIndexStructure();
};
</script>

<style lang="scss" scoped></style>
