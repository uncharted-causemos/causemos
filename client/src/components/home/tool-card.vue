<template>
  <div class="tool-card-container">
    <img :src="`${imgSrc}`" class="thumbnail" :class="[`opacity-${imageOpacity}`]" />
    <h5>{{ title }}</h5>
    <p class="un-font-small subdued tool-card-description">
      {{ subtitle }}
    </p>
    <p class="call-to-action">{{ callToActionTitle }}<i class="fa fa-fw fa-chevron-right" /></p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  imgSrc: string;
  title: string;
  subtitle: string;
  callToActionTitle: string;
  imageOpacity: 'low' | 'medium' | 'high';
}>();
</script>

<style lang="scss" scoped>
@import '@/styles/variables';
@import '@/styles/uncharted-design-tokens';

.tool-card-container {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: white;
  box-shadow: 0px 2px 4px 0px rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;

  .thumbnail {
    transition: opacity 0.2s ease;
  }

  .opacity-low {
    opacity: 30%;
  }
  .opacity-medium {
    opacity: 40%;
  }
  .opacity-high {
    opacity: 50%;
  }

  &:hover {
    transform: translateY(-2px);
    border-color: $selected;

    .thumbnail {
      opacity: 100%;
    }
  }

  h5 {
    font-weight: bold;
  }

  .thumbnail {
    height: 153px;
  }

  .tool-card-description {
    min-height: 32px;
  }

  .call-to-action {
    color: $accent-main;
  }
}
</style>
