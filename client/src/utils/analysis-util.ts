import { AnalysisItem } from '@/types/Analysis';
import { ProjectType } from '@/types/Enums';
import _ from 'lodash';
import { computed } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { createDataSpaceDataState } from './insight-util';

export const MAX_ANALYSIS_DATACUBES_COUNT = 9;

export const createAnalysisItem = (
  id: string,
  datacubeId: string,
  isSelected: boolean
): AnalysisItem => {
  return {
    id,
    datacubeId,
    dataConfig: createDataSpaceDataState(datacubeId),
    itemId: uuidv4(),
    viewConfig: {},
    selected: isSelected
  };
};

export const openDatacubeDrilldown = async (id: string, itemId: string, router: any, project: string, analysisId: string) => {
  router.push({
    name: 'data',
    params: {
      project: project,
      analysisId: analysisId,
      projectType: ProjectType.Analysis
    },
    query: {
      datacube_id: id,
      item_id: itemId
    }
  }).catch(() => {});
};

export function updateDatacubesOutputsMap(itemId: string, store: any, route: any, newOutputIndex: number) {
  const datacubeCurrentOutputsMap = computed(() => store.getters['app/datacubeCurrentOutputsMap']);
  const updatedCurrentOutputsMap = _.cloneDeep(datacubeCurrentOutputsMap.value);
  const datacubeKey = itemId;
  updatedCurrentOutputsMap[datacubeKey] = newOutputIndex;
  store.dispatch('app/setDatacubeCurrentOutputsMap', updatedCurrentOutputsMap);
}
