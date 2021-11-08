<template>
  <div class="histogram-demo-container">
    <histogram
      v-for="(binValues, index) in binValuesList"
      :key="index"
      class="histogram"
      :bin-values="binValues"
    />
  </div>
</template>

<script lang="ts">
import Histogram from '@/components/widgets/charts/histogram.vue';
import { defineComponent } from 'vue';
export default defineComponent({
  components: { Histogram },
  name: 'HistogramDemo',
  setup() {
    return {
      binValuesList: [
        {
          base: [30, 40, 0, 0, 0],
          change: [-20, 20, -10, 10, 0]
        },
        {
          base: [10, 50, 10, 0, 0],
          change: [-20, -10, 20, 10, 0]
        },
        {
          base: [10, 50, 10, 0, 0],
          change: [-20, -10, 10, 20, 0]
        },
        {
          base: [10, 50, 10, 0, 0],
          change: [-20, -10, 0, 10, 20]
        },
        {
          base: [20, 50, 20, 0, 0],
          change: [0, 0, 0, 0, 0]
        },
        {
          base: [10, 40, 10, 0, 0],
          change: [20, -40, 20, 0, 0]
        },
        {
          base: [10, 40, 10, 0, 0],
          change: [-20, 40, -20, 0, 0]
        },
        {
          base: [30, 50, 20, 0, 0],
          change: null
        },
        {
          base: [40, 10, 40, 10, 0],
          change: null
        },
        {
          base: [0, 0, 8, 12, 80],
          change: null
        }
      ]
    };
  }
});
</script>

<style lang="scss" scoped>
.histogram-demo-container {
  background: white;
  max-width: 600px;
  margin: 20px auto;
  padding: 20px;
  border-radius: 4px;
  border: 1px solid lightgrey;
}

.histogram {
  margin-top: 20px;
}
</style>
