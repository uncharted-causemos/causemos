<template>
  <div class="close-button" @click="$emit('click')">
    <i class="fa fa-fw fa-close" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'CloseButton',
  emits: ['click'],
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.close-button {
  font-size: $font-size-large;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  color: #c1c1de;
  cursor: pointer;

  &:hover {
    color: $text-color-dark;
  }

  position: absolute;
  top: 12px;
  right: 12px;
}
</style>
