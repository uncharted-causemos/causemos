import { ref, computed } from 'vue';
import {
  findAndRemoveChild,
  createNewOutputIndex,
  findNode as indexTreeUtilFindNode,
  createIndexTreeActions,
  deleteEdgeFromIndexTree,
} from '@/utils/index-tree-util';
import useIndexWorkBench from '@/services/composables/useIndexWorkBench';
import { IndexNodeType } from '@/types/Enums';
import { ConceptNode } from '@/types/Index';

// States

const targetAnalysisId = ref('');

const outputIndexTree = ref<ConceptNode>(createNewOutputIndex());
const workbench = useIndexWorkBench();

const triggerUpdate = () => {
  outputIndexTree.value = { ...outputIndexTree.value };
};

export default function useIndexTree() {
  // Getters

  // Export a readonly copy of the tree
  const tree = computed(() => outputIndexTree.value);

  // Actions

  const initialize = (analysisId: string, indexTree: ConceptNode) => {
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

  const deleteEdge = (nodeId: string) => {
    const childNode = deleteEdgeFromIndexTree(outputIndexTree.value, nodeId);
    if (childNode !== null && childNode.type !== IndexNodeType.OutputIndex) {
      workbench.appendItem(childNode);
      triggerUpdate();
      return true;
    }
    return false;
  };

  const { findAndRenameNode, findAndAddChild, attachDatasetToNode, toggleDatasetIsInverted } =
    createIndexTreeActions({ findNode, onSuccess: triggerUpdate });

  return {
    tree,
    initialize,
    findNode,
    findAndRenameNode,
    findAndDelete,
    deleteEdge,
    findAndAddChild,
    attachDatasetToNode,
    getAnalysisId,
    toggleDatasetIsInverted,
  };
}
