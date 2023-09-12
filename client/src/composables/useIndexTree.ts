import { ref, computed } from 'vue';
import {
  findAndRemoveChild,
  createNewOutputIndex,
  findNode as indexTreeUtilFindNode,
  createIndexTreeActions,
  deleteEdgeFromIndexTree,
  findAndUpdateIsOppositePolarity,
  countOppositeEdgesBetweenNodes,
} from '@/utils/index-tree-util';
import useIndexWorkBench from '@/composables/useIndexWorkBench';
import { ConceptNode, OppositeEdgeCount } from '@/types/Index';

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

  const updateIsOppositePolarity = (nodeId: string, value: boolean) => {
    const success = findAndUpdateIsOppositePolarity(outputIndexTree.value, nodeId, value);
    if (success) {
      triggerUpdate();
    }
    return success;
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
    if (childNode !== null) {
      workbench.appendItem(childNode);
      triggerUpdate();
      return true;
    }
    return false;
  };

  const oppositeEdgeCountToRoot = (startNode: ConceptNode | null) => {
    const oppositeEdgeCount: OppositeEdgeCount = {
      count: 0,
      endNode: null,
      startNode: null,
    };

    if (startNode !== null) {
      oppositeEdgeCount.startNode = startNode.name;

      let results = findNode(startNode.id) ?? null;
      let rootNode = results?.parent ?? null;

      while (results !== null && results.parent !== null && !results.parent.isOutputNode) {
        results = findNode(results.parent.id) ?? null;
        rootNode = results?.parent ?? null;
      }

      if (rootNode !== null) {
        oppositeEdgeCount.endNode = rootNode.name;
        oppositeEdgeCount.count = countOppositeEdgesBetweenNodes(startNode, rootNode);

        return oppositeEdgeCount;
      }
    }
    return oppositeEdgeCount;
  };

  const {
    findAndRenameNode,
    findAndAddNewChild,
    findAndAddChild,
    attachDatasetToNode,
    detachDatasetFromNode,
    revertNode,
    setDatasetIsInverted,
    containsElement,
  } = createIndexTreeActions({ findNode, onSuccess: triggerUpdate });

  return {
    tree,
    initialize,
    findNode,
    findAndRenameNode,
    findAndDelete,
    deleteEdge,
    findAndAddNewChild,
    findAndAddChild,
    attachDatasetToNode,
    revertNode,
    detachDatasetFromNode,
    getAnalysisId,
    updateIsOppositePolarity,
    setDatasetIsInverted,
    containsElement,
    oppositeEdgeCountToRoot,
  };
}
