<template>
  <div class="index-action-bar-container">
    <button class="btn btn-default" @click="addConcept">Add concept</button>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (e: 'add-concept'): void;
}>();

const addConcept = () => {
  emit('add-concept');
};
</script>

<style scoped lang="scss">
@import '@/styles/uncharted-design-tokens';

.index-action-bar-container {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 5px 20px;

  height: 51px;
  background: white;
  border-bottom: 1px solid $un-color-black-10;
}
</style>
