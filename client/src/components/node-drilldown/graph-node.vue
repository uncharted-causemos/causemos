<template>
  <div class="graph-node-container">
    <header>
      {{ name }}
    </header>
    <div class="graph">
      <!-- TODO: draw a little chart here -->
      (Little chart goes here)
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
export default defineComponent({
  name: 'GraphNode',
  props: {
    name: {
      type: String,
      default: ''
    }
  }
});
</script>

<style lang="scss" scoped>
// TODO: copy graph styles more exactly
.graph-node-container {
  height: 80px;
  width: 140px;
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid lightgray;
}

header {
  background: #eee;
  padding: 1px 3px;
}
</style>
