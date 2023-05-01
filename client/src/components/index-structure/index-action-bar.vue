<template>
  <div class="index-action-bar-container">
    <button class="btn btn-default" @click="addConcept">Add concept</button>
    <button class="btn btn-default" @click="viewProjections">View projections</button>
  </div>
</template>

<script setup lang="ts">
import { ProjectType } from '@/types/Enums';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const emit = defineEmits<{
  (e: 'add-concept'): void;
}>();

const addConcept = () => {
  emit('add-concept');
};

const route = useRoute();
const analysisId = computed(() => route.params.analysisId as string);
const project = computed(() => route.params.project as string);
const router = useRouter();
const viewProjections = () => {
  router.push({
    name: 'indexProjections',
    params: {
      project: project.value,
      analysisId: analysisId.value,
      projectType: ProjectType.Analysis,
    },
  });
};
</script>

<style scoped lang="scss">
@import '@/styles/uncharted-design-tokens';
@import '@/styles/index-graph';

.index-action-bar-container {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 5px 30px;
  gap: 40px;

  height: 51px;
  background: white;
  border-bottom: 1px solid $un-color-black-10;
}

button {
  width: 240px;
}
</style>
