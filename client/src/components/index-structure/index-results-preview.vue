<template>
  <div class="index-results-preview-container">
    <h4>Index results</h4>
    <button class="btn" disabled>See results</button>
  </div>
</template>

<script setup lang="ts"></script>

<style lang="scss" scoped>
@import '~styles/uncharted-design-tokens';

.index-results-preview-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
}
</style>
