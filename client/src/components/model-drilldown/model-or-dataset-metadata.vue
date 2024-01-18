<template>
  <header class="model-or-dataset-metadata-container">
    <h3>{{ metadata?.name }}</h3>
    <div
      class="model-details"
      :class="{ expanded: isModelDetailsSectionExpanded }"
      @click="isModelDetailsSectionExpanded = !isModelDetailsSectionExpanded"
    >
      <p class="subdued un-font-small">
        {{ metadata?.description ?? '...' }}
      </p>
      <p v-if="isModelDetailsSectionExpanded && metadata !== null" class="subdued un-font-small">
        Source: {{ metadata.maintainer.organization }} (<a
          v-if="stringUtil.isValidUrl(metadata.maintainer.website)"
          :href="metadata.maintainer.website"
          target="_blank"
          rel="noopener noreferrer"
          @click.stop
        >
          {{ metadata.maintainer.website }} </a
        >)
      </p>
      <p v-if="isModelDetailsSectionExpanded && metadata !== null" class="subdued un-font-small">
        Registered by: {{ metadata.maintainer.name }} ({{ metadata.maintainer.email }})
      </p>
      <span class="expand-collapse-controls subdued un-font-small">
        <i class="fa" :class="[isModelDetailsSectionExpanded ? 'fa-angle-up' : 'fa-angle-down']" />
        {{ isModelDetailsSectionExpanded ? 'Show less' : 'Show more' }}</span
      >
    </div>
  </header>
</template>

<script setup lang="ts">
import { Indicator, Model } from '@/types/Datacube';
import stringUtil from '@/utils/string-util';
import { ref } from 'vue';

defineProps<{ metadata: Model | Indicator | null }>();

const isModelDetailsSectionExpanded = ref(false);
</script>

<style lang="scss" scoped>
.model-or-dataset-metadata-container {
  padding: 20px;
}

.model-details {
  cursor: pointer;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;

  &:not(.expanded) p {
    // Show only the first 3 lines. Supported with -webkit- prefix in all modern browsers.
    // https://caniuse.com/?search=line-clamp
    overflow-y: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
  }

  .expand-collapse-controls {
    opacity: 0;
    display: inline-block;
    position: absolute;
    top: 100%;
    width: 100%;
    text-align: center;
  }

  &:hover {
    .expand-collapse-controls {
      opacity: 1;
    }
  }
}
</style>
