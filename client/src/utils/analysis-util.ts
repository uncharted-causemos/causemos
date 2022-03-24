import { AnalysisItem } from '@/types/Analysis';
import { Indicator, Model } from '@/types/Datacube';
import { ProjectType } from '@/types/Enums';
import _ from 'lodash';
import { computed } from 'vue';
import { v4 as uuidv4 } from 'uuid';

export const MAX_ANALYSIS_DATACUBES_COUNT = 9;

export const duplicateAnalysisItem = (metadata: Model | Indicator, id: string, analysisId: string, store: any) => {
  // only enable duplication for model datacubes that have more than one variable
  //  and only when there is not card listed that represents all the datacube variables
  const analysisItems = computed<AnalysisItem[]>(() => store.getters['dataAnalysis/analysisItems']);
  const workingAnalysisItems: AnalysisItem[] = _.cloneDeep(analysisItems.value);
  const itemToDuplicate = workingAnalysisItems.find(item => item.id === id);
  if (itemToDuplicate !== undefined) {
    const duplicatedItem = _.cloneDeep(itemToDuplicate);
    duplicatedItem.itemId = uuidv4();
    workingAnalysisItems.push(duplicatedItem);
    const updatedAnalysisInfo = { currentAnalysisId: analysisId, analysisItems: workingAnalysisItems };
    store.dispatch('dataAnalysis/updateAnalysisItems', updatedAnalysisInfo);
  }
};

export const openDatacubeDrilldown = async (id: string, itemId: string, router: any, store: any) => {
  const analysisId = computed(() => store.getters['dataAnalysis/analysisId']);
  const project = computed(() => store.getters['app/project']);
  router.push({
    name: 'data',
    params: {
      project: project.value,
      analysisId: analysisId.value,
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
