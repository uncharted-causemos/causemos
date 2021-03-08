<template>
  <div
    class="close-button"
    @click="$emit('click')"
  >
    <i
      class="fa fa-fw fa-close"
    />
  </div>
</template>

<script>
export default {
  name: 'CloseButton'
};
</script>

<style lang="scss" scoped>
@import "~styles/wm-theme/wm-theme";
@import "~styles/variables";

.close-button {
  font-size: $font-size-large;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  color: $color-btn-default-hover;
  cursor: pointer;

  &:hover {
    color: $color-text-base-dark;
  }

  position: absolute;
  top: 12px;
  right: 12px;
}
</style>
