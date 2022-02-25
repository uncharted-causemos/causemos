<template>
  <div class="path-container">
    <span v-for="(node, idx) of pathItem.path" :key="node">
      {{ ontologyFormatter(node) }}
      <i v-if="idx < pathItem.path.length - 1" class="fa fa-long-arrow-right fa-fw" style="color: #888" />
    </span>
  </div>
</template>


<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { GraphPath } from '@/types/CAG';
import useOntologyFormatter from '@/services/composables/useOntologyFormatter';

export default defineComponent({
  name: 'CAGPathItem',
  props: {
    pathItem: {
      type: Object as PropType<GraphPath>
    }
  },
  setup() {
    return {
      ontologyFormatter: useOntologyFormatter()
    };
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
  background: #EEE;
  cursor: pointer
}
</style>
