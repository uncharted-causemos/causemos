<template>
  <div class="reference-options-list">
    <h5 class="header">Add Reference</h5>
    <div v-for="r in referenceOptions" v-bind:key="r.id">
      <input v-model="r.checked" type="checkbox" @change="handleToggle(r.id)" />
      <span>{{ r.displayName }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { ModelRunReference } from '@/types/ModelRunReference';

export default defineComponent({
  name: 'reference-options-list',
  props: {
    referenceOptions: {
      type: Array as PropType<ModelRunReference[]>,
      required: true,
    },
  },
  emits: ['toggle-reference-options'],
  setup(props, { emit }) {
    const handleToggle = (value: string) => {
      emit('toggle-reference-options', value);
    };
    return {
      handleToggle,
    };
  },
});
</script>

<style lang="scss" scoped>
.reference-options-list {
  background: #f0f0f0;
  padding: 1px 10px;
  h5 {
    text-transform: uppercase;
    font-size: 1.4rem;
    letter-spacing: 0.066rem;
    color: #9c9d9e;
  }
  input {
    appearance: auto;
  }
  div span {
    padding-left: 5px;
  }
}
</style>
