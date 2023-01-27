import { ref, readonly } from 'vue';
import { IndexNode, OutputIndex } from '@/types/Index';
import {
  findAndUpdateNode,
  findAndRemoveChild,
  createNewOutputIndex,
} from '@/utils/indextree-util';

// States

const targetAnalysisId = ref('');

const outputIndexTree = ref<OutputIndex>(createNewOutputIndex());

const triggerUpdate = () => {
  outputIndexTree.value = { ...outputIndexTree.value };
};

export default function useIndexTree() {
  // Getters

  const tree = readonly(outputIndexTree);

  // Actions

  const initialize = (analysisId: string, indexTree: OutputIndex) => {
    targetAnalysisId.value = analysisId;
    outputIndexTree.value = indexTree;
  };

  const getAnalysisId = (): string => {
    return targetAnalysisId.value;
  };

  const findAndUpdate = (updateNode: IndexNode) => {
    const isUpdated = findAndUpdateNode(outputIndexTree.value, updateNode);
    if (isUpdated) {
      triggerUpdate();
    }
  };

  const findAndDelete = (nodeId: string) => {
    if (nodeId === outputIndexTree.value.id) {
      // Reset root node
      outputIndexTree.value = createNewOutputIndex();
      return;
    }
    const isDeleted = findAndRemoveChild(outputIndexTree.value, nodeId);
    if (isDeleted) triggerUpdate();
  };

  return {
    tree,
    initialize,
    findAndUpdate,
    findAndDelete,
    getAnalysisId,
  };
}
