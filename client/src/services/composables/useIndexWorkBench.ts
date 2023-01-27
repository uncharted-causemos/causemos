import _ from 'lodash';
import { ref, readonly } from 'vue';
import { IndexWorkBenchItem } from '@/types/Index';
import {
  findAndUpdateNode,
  findAndRemoveChild,
  findNode as indexTreeUtilFindNode,
} from '@/utils/indextree-util';

// States

// Temporary index nodes that are being created and not yet attached to the main index tree yet
const workBenchItems = ref<IndexWorkBenchItem[]>([]);
const targetAnalysisId = ref('');

export default function useIndexWorkBench() {
  // Getters

  const items = readonly(workBenchItems);

  // Actions

  const initialize = (analysisId: string, items: IndexWorkBenchItem[]) => {
    targetAnalysisId.value = analysisId;
    workBenchItems.value = [...items];
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

  const findAndUpdateItem = (updateItem: IndexWorkBenchItem) => {
    const isUpdated = workBenchItems.value.some((tree) => findAndUpdateNode(tree, updateItem));
    if (isUpdated) {
      workBenchItems.value = [...workBenchItems.value];
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

  return {
    items,
    initialize,
    addItem,
    findNode,
    findAndUpdateItem,
    findAndDeleteItem,
    getAnalysisId,
  };
}
