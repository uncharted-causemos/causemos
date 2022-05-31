import { ProjectType } from '@/types/Enums';
import _ from 'lodash';
import { computed } from 'vue';

export const MAX_ANALYSIS_DATACUBES_COUNT = 9;

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
