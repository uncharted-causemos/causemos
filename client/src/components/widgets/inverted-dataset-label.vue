<template>
  <span class="inverted-dataset-label-container un-font-small" :class="{ inverted: isInverted }">
    {{ isInverted ? 'Inverted' : 'Not inverted' }}
  </span>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    isInverted?: boolean;
  }>(),
  { isInverted: true }
);
</script>

<style lang="scss" scoped>
@import '~styles/uncharted-design-tokens';

.inverted-dataset-label-container {
  padding: 1px 4px;
  border-radius: 2px;
  border: 1px solid $un-color-black-40;
  color: $un-color-black-40;

  &.inverted {
    background: transparent;
    background: $un-color-black-40;
    color: white;
  }
}
</style>
