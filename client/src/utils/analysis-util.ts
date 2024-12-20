import { AnalysisItem } from '@/types/Analysis';
import _ from 'lodash';
import { computed } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { ModelOrDatasetState } from '@/types/Datacube';
import { ProjectType } from '@/types/Enums';
import { Router } from 'vue-router';

export const MAX_ANALYSIS_DATACUBES_COUNT = 9;

export const createAnalysisItem = (
  datacubeId: string,
  dataState: ModelOrDatasetState,
  isSelected: boolean
): AnalysisItem => {
  return {
    id: uuidv4(),
    datacubeId,
    selected: isSelected,
    state: dataState,
  };
};

export const getDatacubeId = (analysisItem: AnalysisItem) => analysisItem.datacubeId;

export const getId = (analysisItem: AnalysisItem) => analysisItem.id;

export const duplicate = (analysisItem: AnalysisItem) => {
  const duplicated: AnalysisItem = _.cloneDeep(analysisItem);
  duplicated.id = uuidv4();
  return duplicated;
};

export const getState = (analysisItem: AnalysisItem) => analysisItem.state;

export function updateDatacubesOutputsMap(itemId: string, store: any, newOutputIndex: number) {
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
  const datacubeId = getDatacubeId(analysisItem);
  const analysisItemId = getId(analysisItem);
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
};
