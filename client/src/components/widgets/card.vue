<template>
  <div
    class="card-container"
    @click="onClick"
  >
    <slot />
  </div>
</template>

<script>

export default {
  name: 'Card',
  methods: {
    onClick() {
      this.$emit('click');
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/_variables.scss";

.card-container {
  background-color: white;
  position: relative;
  border-radius: 3px;
  transition: all 0.15s;
  transform: none;

  /*
    Animating the opacity on a pseudo element drop-shadow
    is more performant than animating the colour of a box-shadow
    property directly.
  */
  &::after {
    content: '';
    position: absolute;
    opacity: .66;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2);
    transition: all 0.15s;
    border-radius: 3px;
    pointer-events: none;
  }

  &:hover {
    cursor: pointer;
    transform: translateY(-2px);

    &::after {
      opacity: 1;
    }
  }
}
</style>
