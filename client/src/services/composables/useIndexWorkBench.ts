import _ from 'lodash';
import { ref, computed } from 'vue';
import { ConceptNode, SelectableIndexElementId } from '@/types/Index';
import {
  createIndexTreeActions,
  deleteEdgeFromIndexTree,
  findAndRemoveChild,
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
        if (child !== null) {
          addItem(child);
        }
      }
    }
  };

  const { findAndRenameNode, findAndAddChild, attachDatasetToNode, toggleDatasetIsInverted } =
    createIndexTreeActions({ findNode, onSuccess: triggerUpdate });

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
    attachDatasetToNode,
    getAnalysisId,
    deleteEdge,
  };
}
