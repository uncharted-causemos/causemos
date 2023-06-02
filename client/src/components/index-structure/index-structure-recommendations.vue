<template>
  <div class="index-structure-recommendations-container">
    <p class="subdued title">{{ title }}</p>
    <div
      v-for="recommendation of recommendationsToDisplay"
      :key="recommendation"
      class="recommendation"
      @click="emit('add-suggestion', recommendation)"
    >
      <span>{{ recommendation }}</span>
      <div class="arrow" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { getCauses } from '@/services/recommender-service';
import { ConceptNodeWithoutDataset } from '@/types/Index';
import { CausalRecommenderQuery } from '@/types/IndexDocuments';
import { computed, ref, watch } from 'vue';

const props = defineProps<{
  parentNode: ConceptNodeWithoutDataset | null;
}>();
const emit = defineEmits<{
  (e: 'add-suggestion', suggestion: string): void;
}>();

const parentNodeName = computed(() => props.parentNode?.name ?? null);

const recommendations = ref<string[]>([]);
const isLoading = ref(false);
watch(
  [parentNodeName],
  async () => {
    recommendations.value = [];
    if (parentNodeName.value === null) {
      isLoading.value = false;
      return;
    }
    const savedParentName = parentNodeName.value;
    isLoading.value = true;
    const query: CausalRecommenderQuery = {
      topic: parentNodeName.value,
    };
    const result = await getCauses(query);
    if (parentNodeName.value !== savedParentName) {
      // Query has changed since the fetch started, so ignore the results
      return;
    }
    recommendations.value = result.causes;
    isLoading.value = false;
  },
  { immediate: true }
);

const recommendationsToDisplay = computed(() => {
  // Filter out any recommendations that already exist as children of the parent
  const existingChildren =
    props.parentNode?.components.map(({ componentNode }) => componentNode.name) ?? [];
  return recommendations.value.filter(
    (recommendation) => existingChildren.includes(recommendation) === false
  );
});

const title = computed(() => {
  if (isLoading.value) {
    return `Finding drivers of ${parentNodeName.value}...`;
  }
  if (recommendationsToDisplay.value.length === 0) {
    return `No drivers of ${parentNodeName.value} were found.`;
  }
  return `Drivers of ${parentNodeName.value}`;
});
</script>

<style lang="scss" scoped>
@import '@/styles/uncharted-design-tokens';
@import '@/styles/index-graph';
@import '@/styles/variables';

$line-length-before-arrowhead: 5px;
$arrowhead-width: 5px;

.index-structure-recommendations-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.title {
  // Align title with the right edges of the recommendations
  margin-right: $line-length-before-arrowhead + $arrowhead-width;
  margin-bottom: 10px;
}

.recommendation {
  display: flex;
  align-items: center;

  &:hover {
    span {
      border-color: $accent-main;
    }
    .arrow {
      background: $accent-main;

      &::after {
        @include arrow-head($accent-main);
      }
    }
  }
}

.recommendation span {
  background: white;
  padding: 5px 10px;
  border-radius: 3px;
  cursor: pointer;
  border: 1px solid $un-color-black-30;
}

.arrow {
  $color: $un-color-black-30;
  $line-width: 2px;
  height: $line-width;
  background: $color;
  display: flex;
  padding-left: $line-length-before-arrowhead;
  align-items: center;
  &::after {
    display: block;
    content: '';
    @include arrow-head($color, $arrowhead-width);
  }
}
</style>