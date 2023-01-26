import { ref, computed } from 'vue';
import { IndexNode, OutputIndex } from '@/types/Index';
import {
  findAndUpdateNode,
  findAndRemoveChild,
  createNewOutputIndex,
} from '@/utils/indextree-util';

const outputIndexTree = ref<OutputIndex>(createNewOutputIndex());
const targetAnalysisId = ref('');

export default function useIndexWorkBench() {
  // read-only index tree
  const tree = computed(() => outputIndexTree.value);

  const triggerUpdate = () => {
    outputIndexTree.value = { ...outputIndexTree.value };
  };

  const init = (analysisId: string, indexTree: OutputIndex) => {
    targetAnalysisId.value = analysisId;
    outputIndexTree.value = indexTree;
    console.log('init index tree');
  };

  const getAnalysisId = (): string => {
    return targetAnalysisId.value;
  };

  const findAndUpdate = (updateNode: IndexNode) => {
    const isUpdated = findAndUpdateNode(outputIndexTree.value, updateNode);
    if (isUpdated) {
      triggerUpdate();
      console.log('index tree: find and update');
    }
  };

  const findAndDelete = (nodeId: string) => {
    if (nodeId === outputIndexTree.value.id) {
      // Reset root node
      outputIndexTree.value = createNewOutputIndex();
      console.log('index tree: find and delete');
      return;
    }
    const isDeleted = findAndRemoveChild(outputIndexTree.value, nodeId);
    if (isDeleted) triggerUpdate();
    console.log('index tree: find and delete');
  };

  return {
    tree,
    init,
    findAndUpdate,
    findAndDelete,
    getAnalysisId,
  };
}
