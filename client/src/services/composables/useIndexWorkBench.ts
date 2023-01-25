import _ from 'lodash';
import { ref, watch, computed } from 'vue';
import { IndexWorkBenchItem } from '@/types/Index';
import { findAndUpdateNode } from '@/utils/indextree-util';

// Temporary index nodes that are being created and not yet attached to the main index tree yet
const workBenchItems = ref<IndexWorkBenchItem[]>([]);

export default function useIndexWorkBench() {
  // read-only items
  const items = computed(() => workBenchItems.value);

  const setItems = (items: IndexWorkBenchItem[]) => {
    workBenchItems.value = [...items];
  };
  const addItem = (item: IndexWorkBenchItem) => {
    workBenchItems.value.unshift(item);
  };
  const findAndUpdate = (updateItem: IndexWorkBenchItem) => {
    const isUpdated = workBenchItems.value.some((tree) => findAndUpdateNode(tree, updateItem));
    if (isUpdated) {
      workBenchItems.value = [...workBenchItems.value];
    }
  };

  // const findAndRemove = () => {

  // }

  watch(workBenchItems, () => {
    console.log(workBenchItems.value);
  });

  return {
    items,
    setItems,
    addItem,
    findAndUpdate,
  };
}
