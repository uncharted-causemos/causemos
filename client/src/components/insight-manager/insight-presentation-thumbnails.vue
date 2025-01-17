<script setup lang="ts">
import { ReviewPosition, SectionWithInsights } from '@/types/Insight';
import ImgLazy from '../widgets/img-lazy.vue';

defineProps<{ insightsBySection: SectionWithInsights[]; reviewPosition: ReviewPosition | null }>();

const emit = defineEmits<{ (e: 'set-review-position', reviewPosition: ReviewPosition): void }>();
</script>

<template>
  <aside class="insight-presentation-thumbnails-container">
    <div
      v-for="(section, sectionIndex) of insightsBySection"
      :key="section.section.id"
      class="section"
    >
      <hr v-if="sectionIndex > 0" />
      <!-- FIXME: ID shouldn't be optional -->
      <div
        class="question-thumbnail thumbnail"
        :class="{
          active:
            reviewPosition?.sectionId === section.section.id && reviewPosition?.insightId === null,
        }"
        @click="
          emit('set-review-position', {
            sectionId: section.section.id as string,
            insightId: null,
          })
        "
      >
        <p>{{ section.section.question }}</p>
      </div>
      <!-- FIXME: IDs shouldn't be optional -->
      <div
        v-for="insight of section.insights"
        :key="insight.id"
        class="insight-thumbnail thumbnail"
        :class="{
          active:
            reviewPosition?.sectionId === section.section.id &&
            reviewPosition?.insightId === insight.id,
        }"
        @click="
          emit('set-review-position', {
            sectionId: section.section.id as string,
            insightId: insight.id as string,
          })
        "
      >
        <ImgLazy :src="`/api/insights/${insight.id}/thumbnail`" class="thumbnail-image" />
      </div>
    </div>
  </aside>
</template>

<style scoped>
.insight-presentation-thumbnails-container {
  background: var(--p-surface-100);
  padding: 5px;
  overflow-y: auto;
}

.section > * {
  margin: 5px 0;
}

.question-thumbnail {
  padding: 5px;
  background: var(--p-surface-0);
  border-radius: 3px;
}

.insight-thumbnail {
  padding: 2px;
  background: var(--p-surface-0);
  border-radius: 3px;
  position: relative;
}

.thumbnail {
  border: 2px solid var(--p-surface-100);
  cursor: pointer;

  &:hover {
    border-color: var(--p-primary-200);
  }

  &.active {
    border-color: var(--p-primary-300);
    cursor: default;
  }
}

.thumbnail-image {
  max-width: 100%;
  display: block;
}

.section > hr {
  border: none;
  border-top: 1px solid var(--p-surface-300);
  margin: 20px 0;
}
</style>
