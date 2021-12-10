<template>
  <div class="path-container">
    <span v-for="(node, idx) of pathItem.path" :key="node">
      {{ node }}
      <i v-if="idx < pathItem.path.length - 1" class="fa fa-arrow-right fa-fw" />
    </span>
  </div>
</template>


<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { GraphPath } from '@/types/CAG';

export default defineComponent({
  name: 'CAGPathItem',
  props: {
    pathItem: {
      type: Object as PropType<GraphPath>
    }
  }
});
</script>


<style lang="scss">
.path-container {
  display: inline-block;
  margin: 5px 0;
  padding: 2px;
  border-bottom: 1px solid #ddd;
}

.path-container:hover {
  background: #f8f8f8;
  cursor: pointer
}
</style>
