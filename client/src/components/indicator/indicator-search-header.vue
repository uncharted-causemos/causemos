<template>
  <div class="indicator-search-result-container">
    <span class="column column--double">Indicator name</span>
    <span class="column">Units</span>
    <span class="column">Dataset/Model</span>
    <span class="column">Countries</span>
    <span class="column">Admin levels</span>
    <span class="column">Period</span>
  </div>
</template>

<script>

export default {
  name: 'IndicatorSearchHeader'
};
</script>

<style lang="scss" scoped>
  @import "~styles/variables";
  @import "~styles/wm-theme/wm-theme";

  .indicator-search-result-container {
    display: flex;
    padding: 4px 12px;
  }

  .column {
    flex: 1;
    &:not(:last-child) {
      padding-right: 5px;
    }
  }

  .column--double {
    flex-grow: 2;
  }

  span {
    color: $label-color;
    font-size: $font-size-small;
    font-weight: bold;
  }
</style>
