<template>
  <div class="index-results-preview-container">
    <h4>Index results</h4>
    <button :disabled="!canViewResults" class="btn btn-call-to-action" @click="seeResults">
      See results
    </button>
    <p v-if="!canViewResults" class="de-emphasized">
      There are no datasets with a path to this index.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import router from '@/router';
import { useStore } from 'vuex';
import { ProjectType } from '@/types/Enums';
import { indexNodeTreeContainsDataset } from '@/utils/index-tree-util';
import useIndexTree from '@/services/composables/useIndexTree';

const props = defineProps<{
  analysisId: string;
}>();

const indexTree = useIndexTree();
const canViewResults = computed(() => indexNodeTreeContainsDataset(indexTree.tree.value));

const store = useStore();
const project = computed(() => store.getters['app/project']);
const seeResults = () => {
  router.push({
    name: 'indexResults',
    params: {
      project: project.value,
      analysisId: props.analysisId,
      projectType: ProjectType.Analysis,
    },
  });
};
</script>

<style lang="scss" scoped>
@import '~styles/uncharted-design-tokens';

.index-results-preview-container {
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: flex-start;
}

.de-emphasized {
  color: $un-color-black-40;
}
</style>
