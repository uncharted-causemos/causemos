import _ from 'lodash';
import { ref, computed } from 'vue';
import { IndexWorkBenchItem } from '@/types/Index';
import { findAndUpdateNode } from '@/utils/indextree-util';

// Temporary index nodes that are being created and not yet attached to the main index tree yet
const workBenchItems = ref<IndexWorkBenchItem[]>([]);
const targetAnalysisId = ref('');

export default function useIndexWorkBench() {
  // read-only items
  const items = computed(() => workBenchItems.value);

  const init = (analysisId: string, items: IndexWorkBenchItem[]) => {
    targetAnalysisId.value = analysisId;
    workBenchItems.value = [...items];
    console.log('init workbench');
  };
  const getAnalysisId = (): string => {
    return targetAnalysisId.value;
  };
  const addItem = (item: IndexWorkBenchItem) => {
    workBenchItems.value = [item, ...workBenchItems.value];
    console.log('add item ');
  };
  const findAndUpdateItem = (updateItem: IndexWorkBenchItem) => {
    const isUpdated = workBenchItems.value.some((tree) => findAndUpdateNode(tree, updateItem));
    if (isUpdated) {
      workBenchItems.value = [...workBenchItems.value];
      console.log('find and update');
    }
  };

  return {
    items,
    init,
    addItem,
    findAndUpdateItem,
    getAnalysisId,
  };
}
