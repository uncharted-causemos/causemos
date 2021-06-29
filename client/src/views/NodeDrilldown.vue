<template>
  <div class="node-drilldown-container">
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
export default defineComponent({
  name: 'NodeDrilldown',
  setup() {
    // TODO: get CAG and selected node from route
    // TODO: fetch top drivers and top impacts (as well as edge colours/weights)
    //  CLARIFICATION REQUIRED:
    //    is this taken from the sensitivity analysis?
    //    do we want a maximum number of drivers/impacts? or add a scrollbar?
    // TODO: fetch historical/projection data for each driver/impact and selected node.
    return {

    };
  }
});
</script>

<style lang="scss" scoped>

</style>
