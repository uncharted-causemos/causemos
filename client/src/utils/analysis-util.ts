import { AnalysisItem } from '@/types/Analysis';
import _ from 'lodash';
import { computed } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { createDataSpaceDataState } from './insight-util';

export const MAX_ANALYSIS_DATACUBES_COUNT = 9;

// Assumption: isSelected should only be true if the analysis that this item
//  will be added to has less than MAX_ANALYSIS_DATACUBES_COUNT already selected
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

export function updateDatacubesOutputsMap(itemId: string, store: any, route: any, newOutputIndex: number) {
  const datacubeCurrentOutputsMap = computed(() => store.getters['app/datacubeCurrentOutputsMap']);
  const updatedCurrentOutputsMap = _.cloneDeep(datacubeCurrentOutputsMap.value);
  const datacubeKey = itemId;
  updatedCurrentOutputsMap[datacubeKey] = newOutputIndex;
  store.dispatch('app/setDatacubeCurrentOutputsMap', updatedCurrentOutputsMap);
}
