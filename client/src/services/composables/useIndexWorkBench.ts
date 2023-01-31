import _ from 'lodash';
import { ref, readonly } from 'vue';
import { IndexWorkBenchItem } from '@/types/Index';
import {
  findAndRemoveChild,
  findNode as indexTreeUtilFindNode,
  isParentNode,
  createNewPlaceholderDataset,
  createNewIndex,
} from '@/utils/indextree-util';
import { IndexNodeType } from '@/types/Enums';

// States

// Temporary index nodes that are being created and not yet attached to the main index tree yet
const workBenchItems = ref<IndexWorkBenchItem[]>([]);
const targetAnalysisId = ref('');

export default function useIndexWorkBench() {
  // Getters

  const items = readonly(workBenchItems);

  // Actions

  const initialize = (analysisId: string, initialItems: IndexWorkBenchItem[]) => {
    targetAnalysisId.value = analysisId;
    workBenchItems.value = [...initialItems];
  };

  const triggerUpdate = () => {
    workBenchItems.value = [...workBenchItems.value];
  };

  const getAnalysisId = (): string => {
    return targetAnalysisId.value;
  };

  const addItem = (item: IndexWorkBenchItem) => {
    workBenchItems.value = [item, ...workBenchItems.value];
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

  const findAndRenameNode = (nodeId: string, newName: string) => {
    const node = findNode(nodeId)?.found;
    if (node !== undefined) {
      node.name = newName;
      triggerUpdate();
    }
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

  const findAndAddChild = (
    parentNodeId: string,
    childType: IndexNodeType.Index | IndexNodeType.Dataset
  ) => {
    const parentNode = findNode(parentNodeId)?.found;
    if (parentNode === undefined || !isParentNode(parentNode)) {
      return;
    }
    const newNode =
      childType === IndexNodeType.Dataset ? createNewPlaceholderDataset() : createNewIndex();
    parentNode.inputs.unshift(newNode);
    triggerUpdate();
  };

  return {
    items,
    initialize,
    addItem,
    findNode,
    findAndRenameNode,
    findAndDeleteItem,
    findAndAddChild,
    getAnalysisId,
  };
}
