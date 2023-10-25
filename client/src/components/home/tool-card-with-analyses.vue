<template>
  <div class="tool-card-with-analyses-container">
    <tool-card
      @click="emit('create')"
      :imgSrc="imgSrc"
      :image-opacity="imageOpacity"
      :title="title"
      :subtitle="subtitle"
      :call-to-action-title="callToActionTitle"
    />
    <div class="recent-items">
      <p>{{ recentItemsTitle }}</p>
      <recent-analysis
        v-for="analysis of analyses"
        :key="analysis.analysisId"
        :analysis="analysis"
        @open="(analysis) => emit('open', analysis)"
        @delete="(analysis) => emit('delete', analysis)"
        @rename="(analysis) => emit('rename', analysis)"
        @duplicate="(analysis) => emit('duplicate', analysis)"
      />
      <div v-if="analyses.length === 0" class="un-font-small subdued">
        {{ recentItemsTypePlural }} that you create will appear here.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Analysis } from '@/types/Analysis';
import ToolCard from '@/components/home/tool-card.vue';
import RecentAnalysis from '@/components/home/recent-analysis.vue';

defineProps<{
  imgSrc: string;
  title: string;
  subtitle: string;
  callToActionTitle: string;
  imageOpacity: 'low' | 'medium' | 'high';
  analyses: Analysis[];
  recentItemsTitle: string;
  recentItemsTypePlural: string;
}>();

const emit = defineEmits<{
  (e: 'create'): void;
  (e: 'open', analysis: Analysis): void;
  (e: 'delete', analysis: Analysis): void;
  (e: 'duplicate', analysis: Analysis): void;
  (e: 'rename', analysis: Analysis): void;
}>();
</script>

<style lang="scss" scoped>
.recent-items {
  margin-top: 20px;

  & > p {
    margin-bottom: 5px;
  }
}
</style>
