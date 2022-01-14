<template>
  <div class="ridgeline-container">
    <svg ref="renderTarget"></svg>
  </div>
</template>

<script lang="ts">
import { RidgelinePoint } from '@/utils/ridgeline-util';
import _ from 'lodash';
import {
  computed,
  defineComponent,
  PropType,
  ref,
  toRefs,
  watchEffect
} from 'vue';

export default defineComponent({
  name: 'Histogram',
  props: {
    ridgelineData: {
      type: Object as PropType<RidgelinePoint[]>,
      required: true
    },
    comparisonBaseline: {
      type: Object as PropType<RidgelinePoint[] | null>,
      default: null
    }
  },
  setup(props) {
    const { ridgelineData, comparisonBaseline } = toRefs(props);

    const renderTarget = ref(null);
    watchEffect(() => {
      console.log('render ridgelineData', ridgelineData.value);
    });

    const isRelativeToActive = computed(
      () => comparisonBaseline.value !== null
    );

    return {
      renderTarget,
      isRelativeToActive
    };
  }
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables';

.ridgeline-container {
  display: flex;
  height: 100px;
  position: relative;
}
</style>
