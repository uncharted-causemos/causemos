<template>
  <span
    class="inverted-dataset-label-container"
    :class="{ inverted: isInverted, 'un-font-small': isSmall }"
  >
    {{ message }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    isInverted?: boolean;
    customMessage?: string | null;
    isSmall?: boolean;
  }>(),
  { isInverted: true, customMessage: null, isSmall: true }
);

const message = computed(() => {
  if (props.customMessage !== null) {
    return props.customMessage;
  }
  return props.isInverted ? 'Inverted' : 'Not inverted';
});
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
