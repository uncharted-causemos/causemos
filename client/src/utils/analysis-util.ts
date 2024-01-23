import {
  AnalysisItem,
  CachedDatacubeMetadata,
  NewAnalysisItem,
  OldAnalysisItem,
} from '@/types/Analysis';
import _ from 'lodash';
import { computed } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { createDataSpaceDataState } from './insight-util';
import { ModelOrDatasetState } from '@/types/Datacube';
import { convertFromLegacyState } from './legacy-data-space-state-util';
import { ProjectType } from '@/types/Enums';
import { Router } from 'vue-router';

export const MAX_ANALYSIS_DATACUBES_COUNT = 9;

// Assumption: isSelected should only be true if the analysis that this item
//  will be added to has less than MAX_ANALYSIS_DATACUBES_COUNT already selected
export const createAnalysisItem = (
  id: string,
  datacubeId: string,
  cachedMetadata: CachedDatacubeMetadata,
  isSelected: boolean
): AnalysisItem => {
  return {
    id,
    datacubeId,
    cachedMetadata,
    dataConfig: createDataSpaceDataState(datacubeId),
    itemId: uuidv4(),
    viewConfig: {},
    selected: isSelected,
  };
};

export const createNewAnalysisItem = (
  datacubeId: string,
  dataState: ModelOrDatasetState,
  isSelected: boolean
): NewAnalysisItem => {
  return {
    id: uuidv4(),
    datacubeId,
    selected: isSelected,
    state: dataState,
  };
};

export function isNewAnalysisItem(analysisItem: AnalysisItem): analysisItem is NewAnalysisItem {
  return (analysisItem as NewAnalysisItem).state !== undefined;
}

export const getDatacubeId = (analysisItem: AnalysisItem) => {
  return isNewAnalysisItem(analysisItem) ? analysisItem.datacubeId : analysisItem.id;
};

export const getId = (analysisItem: AnalysisItem) => {
  return isNewAnalysisItem(analysisItem) ? analysisItem.id : analysisItem.itemId;
};

export const duplicate = (analysisItem: AnalysisItem) => {
  const duplicated: AnalysisItem = _.cloneDeep(analysisItem);
  isNewAnalysisItem(duplicated) ? (duplicated.id = uuidv4()) : (duplicated.itemId = uuidv4());
  return duplicated;
};

const getNewStateFromOldAnalysisItem = (analysisItem: OldAnalysisItem) => {
  const { datacubeId, viewConfig, dataConfig } = analysisItem;
  // default(initial) feature and run ID are missing from old analysis item. Set them to "" to tell they are empty
  const defaultRunId = '';
  const defaultFeature = '';
  return convertFromLegacyState(datacubeId, defaultRunId, viewConfig, dataConfig, defaultFeature);
};

export const getState = (analysisItem: AnalysisItem) => {
  return isNewAnalysisItem(analysisItem)
    ? analysisItem.state
    : getNewStateFromOldAnalysisItem(analysisItem);
};

export function updateDatacubesOutputsMap(
  itemId: string,
  store: any,
  route: any,
  newOutputIndex: number
) {
  const datacubeCurrentOutputsMap = computed(() => store.getters['app/datacubeCurrentOutputsMap']);
  const updatedCurrentOutputsMap = _.cloneDeep(datacubeCurrentOutputsMap.value);
  const datacubeKey = itemId;
  updatedCurrentOutputsMap[datacubeKey] = newOutputIndex;
  store.dispatch('app/setDatacubeCurrentOutputsMap', updatedCurrentOutputsMap);
}

export const openDatacubeDrilldown = async (
  router: Router,
  project: string,
  analysisId: string,
  analysisItem: AnalysisItem,
  isModel: boolean
) => {
  const isNewItem = isNewAnalysisItem(analysisItem);
  const datacubeId = getDatacubeId(analysisItem);
  const analysisItemId = getId(analysisItem);
  if (isNewItem) {
    return router
      .push({
        name: isModel ? 'modelDrilldown' : 'datasetDrilldown',
        params: {
          projectType: ProjectType.Analysis,
          project,
          datacubeId,
        },
        query: {
          analysis_id: analysisId,
          analysis_item_id: analysisItemId,
        },
      })
      .catch(() => {});
  }
  router
    .push({
      name: 'data',
      params: {
        project,
        analysisId,
        projectType: ProjectType.Analysis,
      },
      query: {
        datacube_id: datacubeId,
        item_id: analysisItemId,
      },
    })
    .catch(() => {});
};
