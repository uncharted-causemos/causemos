<template>
  <div class="overlay-container">
    <div class="message-container">
      <i class="fa fa-spin fa-spinner" /> {{ message }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
/**
 * Simple overlay for loading things
*/
export default defineComponent({
  name: 'Overlay',
  props: {
    message: {
      type: String,
      default: 'Loading...'
    }
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.overlay-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #000;
  opacity: 0.5;
  z-index: 9999;

  .message-container {
    font-size: 4rem;
    color: $text-color-light;
  }
}
</style>
