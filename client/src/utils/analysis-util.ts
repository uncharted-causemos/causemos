import { AnalysisItem } from '@/types/Analysis';
import { Indicator, Model } from '@/types/Datacube';
import { ProjectType } from '@/types/Enums';
import _ from 'lodash';
import { computed } from 'vue';

export const MAX_ANALYSIS_DATACUBES_COUNT = 9;

const getNextAvailableDatacubeVariable = (metadata: Model | Indicator, id: string, analysisItems: AnalysisItem[]) => {
  if (metadata !== null && analysisItems.length > 0) {
    const outputs = metadata.outputs.map(output => output.name);
    const matchingItems = analysisItems.filter(item => item.id === id);
    const existingValiables = matchingItems.map(datacubeItem => datacubeItem.datacubeId);
    let foundName = '';
    outputs.forEach(outputName => {
      if (!existingValiables.includes(outputName)) {
        foundName = outputName;
      }
    });
    if (foundName !== '') return foundName;
  }
  return null;
};

export const duplicateAnalysisItem = (metadata: Model | Indicator, id: string, analysisId: string, store: any) => {
  // only enable duplication for model datacubes that have more than one variable
  //  and only when there is not card listed that represents all the datacube variables
  const analysisItems = computed<AnalysisItem[]>(() => store.getters['dataAnalysis/analysisItems']);
  const nextDuplicateVarName = getNextAvailableDatacubeVariable(metadata, id, analysisItems.value);
  if (nextDuplicateVarName !== null) {
    const workingAnalysisItems: AnalysisItem[] = _.cloneDeep(analysisItems.value);
    const itemToDuplicate = workingAnalysisItems.find(item => item.id === id);
    if (itemToDuplicate !== undefined) {
      const duplicatedItem = _.cloneDeep(itemToDuplicate);
      duplicatedItem.datacubeId = nextDuplicateVarName; // uuid
      workingAnalysisItems.push(duplicatedItem);
      const updatedAnalysisInfo = { currentAnalysisId: analysisId, analysisItems: workingAnalysisItems };
      store.dispatch('dataAnalysis/updateAnalysisItems', updatedAnalysisInfo);
    }
  }
};

export const openDatacubeDrilldown = async (id: string, datacubeId: string, router: any, store: any) => {
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
      datacube_var_id: datacubeId
    }
  }).catch(() => {});
};
