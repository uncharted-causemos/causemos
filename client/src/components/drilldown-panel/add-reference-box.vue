<template>
  <div class="add-reference-box">
    <h5 class="header">Add Reference</h5>
    <div
      v-for="referenceCheckbox in referenceCheckboxes"
      v-bind:key="referenceCheckbox.id"
    >
      <input
        v-model="referenceCheckbox.checked"
        type="checkbox"
        @change="handleToggle"
      >
      <span>{{ referenceCheckbox.displayName }}</span>
    </div>
  </div>
</template>

<script lang="ts">

import { defineComponent, PropType, toRefs } from 'vue';
import { ModelRunReference } from '@/types/ModelRunReference';

export default defineComponent({
  name: 'AddReferenceBox',
  props: {
    referenceCheckboxes: {
      type: Array as PropType<ModelRunReference[]>,
      required: true
    }
  },
  setup(props, { emit }) {
    const {
      referenceCheckboxes
    } = toRefs(props);
    console.log(referenceCheckboxes);
    const handleToggle = (value: string) => {
      console.log(value);
      emit('toggle-reference-box', value);
    };
    return {
      handleToggle
    };
  }
});

</script>

<style lang="scss" scoped>

.add-reference-box {
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
