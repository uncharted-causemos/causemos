import { ref, computed } from 'vue';
import { ConceptNode, SelectableIndexElementId } from '@/types/Index';
import {
  createIndexTreeActions,
  deleteEdgeFromIndexTree,
  findAndRemoveChild,
  findAndUpdateIsOppositePolarity,
  findNode as indexTreeUtilFindNode,
  isEdge,
} from '@/utils/index-tree-util';

// States

// Temporary index nodes that are being created and not yet attached to the main index tree yet
const workBenchItems = ref<ConceptNode[]>([]);
const targetAnalysisId = ref('');

const triggerUpdate = () => {
  workBenchItems.value = [...workBenchItems.value];
};

export default function useIndexWorkBench() {
  // Getters

  const items = computed<ConceptNode[]>(() => workBenchItems.value);

  // Actions

  const initialize = (analysisId: string, initialItems: ConceptNode[]) => {
    targetAnalysisId.value = analysisId;
    workBenchItems.value = [...initialItems];
  };

  const getAnalysisId = (): string => {
    return targetAnalysisId.value;
  };

  const addItem = (item: ConceptNode) => {
    workBenchItems.value = [item, ...workBenchItems.value];
  };

  const appendItem = (item: ConceptNode) => {
    workBenchItems.value = [...workBenchItems.value, item];
  };

  const findNode = (nodeId: string) => {
    for (const tree of workBenchItems.value) {
      const found = indexTreeUtilFindNode(tree, nodeId);
      if (found !== undefined) {
        return found;
      }
    }
    return undefined;
  };

  const isDescendant = (descendantId: string, ancestorId: string): boolean => {
    const results = findNode(ancestorId) ?? null;
    if (results !== null) {
      const findResults = indexTreeUtilFindNode(results.found, descendantId) ?? null;
      if (findResults !== null) {
        return true;
      }
    }
    return false;
  };

  const findAndDeleteItem = (nodeId: string) => {
    let isDeleted = false;
    // Search among root nodes first
    const newItems = workBenchItems.value.filter((item) => item.id !== nodeId);
    isDeleted = newItems.length < workBenchItems.value.length;
    if (isDeleted) {
      workBenchItems.value = newItems;
      return;
    }
    isDeleted = workBenchItems.value.some((tree) => findAndRemoveChild(tree, nodeId));
    if (isDeleted) {
      workBenchItems.value = newItems;
    }
  };

  const updateIsOppositePolarity = (nodeId: string, value: boolean) => {
    const success = workBenchItems.value.some((tree) =>
      findAndUpdateIsOppositePolarity(tree, nodeId, value)
    );
    if (success) {
      triggerUpdate();
    }
    return success;
  };

  const deleteEdge = (nodeIds: SelectableIndexElementId) => {
    if (isEdge(nodeIds)) {
      const node = findNode(nodeIds.targetId);
      if (node && node?.found !== null) {
        const child = deleteEdgeFromIndexTree(node.found, nodeIds.sourceId);
        if (child !== null) {
          addItem(child);
        }
      }
    }
  };

  const {
    findAndRenameNode,
    findAndAddNewChild,
    findAndAddChild,
    attachDatasetToNode,
    toggleDatasetIsInverted,
  } = createIndexTreeActions({ findNode, onSuccess: triggerUpdate });
  const popItem = (nodeId: string): ConceptNode | null => {
    const itemToPop = workBenchItems.value.filter((item) => item.id === nodeId);
    if (itemToPop.length === 1) {
      findAndDeleteItem(nodeId);
      return itemToPop[0];
    }
    return null;
  };

  return {
    items,
    initialize,
    addItem,
    appendItem,
    findNode,
    findAndRenameNode,
    findAndDeleteItem,
    findAndAddNewChild,
    findAndAddChild,
    toggleDatasetIsInverted,
    attachDatasetToNode,
    getAnalysisId,
    deleteEdge,
    popItem,
    isDescendant,
    updateIsOppositePolarity,
  };
}
