<template>
  <div class="overlay-container">
    <div class="message-container">
      <i class="fa fa-spin fa-spinner" /> {{ message }}
    </div>
  </div>
</template>

<script>
/**
 * Simple overlay for loading things
*/
export default {
  name: 'Overlay',
  props: {
    message: {
      type: String,
      default: 'Loading...'
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/wm-theme/wm-theme";
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
  z-index: map-get($z-index-order, overlay);

  .message-container {
    font-size: $font-size-h1;
    color: $color-text-second-light;
  }
}
</style>
