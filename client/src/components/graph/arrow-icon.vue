<template>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 10">
    <defs>
      <marker
        :id="`arrowhead-${edgeColor}`"
        markerWidth="10"
        markerHeight="10"
        refX="0"
        refY="5"
        orient="auto"
      >
        <polygon points="0 2, 5 5, 0 8" :fill="edgeColor" />
      </marker>
    </defs>
    <line
      x1="0"
      y1="5"
      x2="10"
      y2="5"
      :stroke="edgeColor"
      :stroke-dasharray="dashArray"
      stroke-width="1"
      :marker-end="`url(#arrowhead-${edgeColor})`"
    />
  </svg>
</template>

<script lang="ts">
import { NEGATIVE_COLOR, POSITIVE_COLOR } from '@/utils/colors-util';
import { computed, defineComponent, PropType, toRefs } from '@vue/runtime-core';

export enum ArrowType {
  Positive = 'POSITIVE',
  Negative = 'NEGATIVE',
  Ambiguous = 'AMBIGUOUS',
  NoEvidence = 'NO_EVIDENCE',
}

export default defineComponent({
  name: 'ArrowIcon',
  props: {
    type: {
      type: String as PropType<string | null>,
      default: null,
    },
  },
  setup(props) {
    const { type } = toRefs(props);
    const edgeColor = computed(() => {
      switch (type.value) {
        case ArrowType.Positive:
          return POSITIVE_COLOR;
        case ArrowType.Negative:
          return NEGATIVE_COLOR;
        case ArrowType.Ambiguous:
          return 'grey';
        default:
          return '#000';
      }
    });
    return {
      edgeColor,
      dashArray: computed(() => (type.value === ArrowType.NoEvidence ? '2' : '')),
    };
  },
});
</script>

<style lang="scss" scoped></style>
