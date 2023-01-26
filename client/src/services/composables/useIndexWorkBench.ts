import _ from 'lodash';
import { ref, computed } from 'vue';
import { IndexWorkBenchItem } from '@/types/Index';
import { findAndUpdateNode, findAndRemoveChild } from '@/utils/indextree-util';

// Temporary index nodes that are being created and not yet attached to the main index tree yet
const workBenchItems = ref<IndexWorkBenchItem[]>([]);
const targetAnalysisId = ref('');

export default function useIndexWorkBench() {
  // read-only items
  const items = computed(() => workBenchItems.value);

  const init = (analysisId: string, items: IndexWorkBenchItem[]) => {
    targetAnalysisId.value = analysisId;
    workBenchItems.value = [...items];
  };

  const getAnalysisId = (): string => {
    return targetAnalysisId.value;
  };

  const addItem = (item: IndexWorkBenchItem) => {
    workBenchItems.value = [item, ...workBenchItems.value];
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
    init,
    addItem,
    findAndUpdateItem,
    findAndDeleteItem,
    getAnalysisId,
  };
}
