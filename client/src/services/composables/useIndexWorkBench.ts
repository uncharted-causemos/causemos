import { computed, ref } from 'vue';
import { IndexWorkBenchItem, SelectableIndexElementId } from '@/types/Index';
import {
  createIndexTreeActions,
  deleteEdgeFromIndexTree,
  findAndRemoveChild,
  findNode as indexTreeUtilFindNode,
  isEdge,
} from '@/utils/index-tree-util';
import { IndexNodeType } from '@/types/Enums';

// States

// Temporary index nodes that are being created and not yet attached to the main index tree yet
const workBenchItems = ref<IndexWorkBenchItem[]>([]);
const targetAnalysisId = ref('');

const triggerUpdate = () => {
  workBenchItems.value = [...workBenchItems.value];
};

export default function useIndexWorkBench() {
  // Getters

  const items = computed<IndexWorkBenchItem[]>(() => workBenchItems.value);

  // Actions

  const initialize = (analysisId: string, initialItems: IndexWorkBenchItem[]) => {
    targetAnalysisId.value = analysisId;
    workBenchItems.value = [...initialItems];
  };

  const getAnalysisId = (): string => {
    return targetAnalysisId.value;
  };

  const addItem = (item: IndexWorkBenchItem) => {
    workBenchItems.value = [item, ...workBenchItems.value];
  };

  const appendItem = (item: IndexWorkBenchItem) => {
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

  const deleteEdge = (nodeIds: SelectableIndexElementId) => {
    if (isEdge(nodeIds)) {
      const node = findNode(nodeIds.targetId);
      if (node && node?.found !== null) {
        const child = deleteEdgeFromIndexTree(node.found, nodeIds.sourceId);
        if (child !== null && child.type !== IndexNodeType.OutputIndex) {
          addItem(child);
        }
      }
    }
  };

  const popItem = (nodeId: string): IndexWorkBenchItem | null => {
    const itemToPop = workBenchItems.value.filter((item) => item.id === nodeId);
    if (itemToPop.length === 1) {
      findAndDeleteItem(nodeId);
      return itemToPop[0];
    }
    return null;
  };

  const {
    findAndRenameNode,
    findAndAddChild,
    attachDatasetToPlaceholder,
    toggleDatasetIsInverted,
  } = createIndexTreeActions({ findNode, onSuccess: triggerUpdate });

  return {
    items,
    initialize,
    addItem,
    appendItem,
    findNode,
    findAndRenameNode,
    findAndDeleteItem,
    findAndAddChild,
    toggleDatasetIsInverted,
    attachDatasetToPlaceholder,
    getAnalysisId,
    deleteEdge,
    popItem,
  };
}
