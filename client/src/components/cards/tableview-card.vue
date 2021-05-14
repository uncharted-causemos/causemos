<template>
  <div class="tableview-card-container">
    <div class="row tableview-row">
      <div class="col-sm-3 number-col">
        {{ card.title }}
      </div>
      <div class="col-sm-3 number-col">
        {{ card['metadata'].Publication }}
      </div>
      <div class="col-sm-3 number-col">
        {{ card.subtitle[0] }}
      </div>
      <div class="col-sm-3 number-col">
        {{ card.summary }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'tableview-card',
  props: {
    card: {
      type: Object,
      default: () => {}
    }
  }
};
</script>

<style scoped lang="scss">
  @import '~styles/variables';

  .tableview-card-container {
    cursor: pointer;
    background: #fcfcfc;
    border: 1px solid #dedede;
    margin: 1px 0;
    padding: 10px;
  }

  .tableview-card-container:hover {
    border: 1px solid $selected;
    cursor: pointer;
  }

  .selected {
    border-left: 4px solid $selected;
    background-color: #ffffff;
  }
  .tableview-row {
    background: #fcfcfc;
    padding: 10px;
    margin: 0;
  }
</style>
