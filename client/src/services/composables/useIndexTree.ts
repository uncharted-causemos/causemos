import { ref, computed } from 'vue';
import { OutputIndex } from '@/types/Index';
import {
  findAndRemoveChild,
  createNewOutputIndex,
  findNode as indexTreeUtilFindNode,
  createIndexTreeActions,
} from '@/utils/indextree-util';

// States

const targetAnalysisId = ref('');

const outputIndexTree = ref<OutputIndex>(createNewOutputIndex());

const triggerUpdate = () => {
  outputIndexTree.value = { ...outputIndexTree.value };
};

export default function useIndexTree() {
  // Getters

  // Export a readonly copy of the tree
  const tree = computed(() => outputIndexTree.value);

  // Actions

  const initialize = (analysisId: string, indexTree: OutputIndex) => {
    targetAnalysisId.value = analysisId;
    outputIndexTree.value = indexTree;
  };

  const getAnalysisId = (): string => {
    return targetAnalysisId.value;
  };

  const findNode = (nodeId: string) => {
    return indexTreeUtilFindNode(outputIndexTree.value, nodeId);
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

  const {
    findAndRenameNode,
    findAndAddChild,
    attachDatasetToPlaceholder,
    toggleDatasetIsInverted,
  } = createIndexTreeActions({ findNode, onSuccess: triggerUpdate });

  return {
    tree,
    initialize,
    findNode,
    findAndRenameNode,
    findAndDelete,
    findAndAddChild,
    attachDatasetToPlaceholder,
    getAnalysisId,
    toggleDatasetIsInverted,
  };
}
