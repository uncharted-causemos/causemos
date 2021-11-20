<template>
  <div class="reference-series-list">
    <h5 class="header">Add Reference</h5>
    <div
      v-for="r in referenceSeries"
      v-bind:key="r.id"
    >
      <input
        v-model="r.checked"
        type="checkbox"
        @change="handleToggle(r.id)"
      >
      <span>{{ r.displayName }}</span>
    </div>
  </div>
</template>

<script lang="ts">

import { defineComponent, PropType } from 'vue';
import { ModelRunReference } from '@/types/ModelRunReference';

export default defineComponent({
  name: 'reference-series-list',
  props: {
    referenceSeries: {
      type: Array as PropType<ModelRunReference[]>,
      required: true
    }
  },
  setup(props, { emit }) {
    const handleToggle = (value: string) => {
      emit('toggle-reference-series', value);
    };
    return {
      handleToggle
    };
  }
});

</script>

<style lang="scss" scoped>

.reference-series-list {
  background: #F0F0F0;
  padding: 1px 10px;
  h5 {
    text-transform: uppercase;
    font-size: 1.4rem;
    letter-spacing: 0.066rem;
    color: #9C9D9E;
  }
  input {
    appearance: auto;
  }
  div span {
    padding-left: 5px;
  }
}

</style>
