<template>
  <div class="add-reference-box">
    <div>Add Reference</div>
    <label
      v-for="referenceCheckbox in referenceCheckboxes"
      v-bind:key="referenceCheckbox.id"
    >
      <input
        v-model="referenceCheckbox.id"
        type="checkbox"
        @change="handleToggle"
      >
      {{ referenceCheckbox.displayName }}
    </label>
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

<style scoped>

.add-reference-box input {
  appearance: auto;
}

</style>
