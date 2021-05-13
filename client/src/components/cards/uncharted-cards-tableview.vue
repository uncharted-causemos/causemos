<template>
  <div>
    <h1>TABLE VIEW!</h1>
  </div>
</template>

<script>
export default {
  name: 'UnchartedCardsTableview',
  props: {
    data: {
      type: Array,
      default: () => []
    },
    config: {
      type: Object,
      default: () => ({})
    }
  }
};
</script>

<style scoped lang="scss">
@import '~styles/variables';

</style>
