<template>
  <svg class="svg">
    <rect width="100%" height="100%"/>
  </svg>
</template>

<script>

export default {
  name: 'aggregation-checklist-rectangle'
};

</script>

<style lang="scss" scoped>

.svg {
  width: 2px;
  height: 8px;
  top: -2px;
  position: relative;
  opacity: 100%;
  & .rect {
    fill: #000000;
    opacity: 100%;
  }
}

</style>
