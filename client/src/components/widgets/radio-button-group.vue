<template>
  <div class="radio-button-group-container">
    <button
      v-for="button of buttons"
      :key="button.value"
      :disabled="button.value === selectedButtonValue"
      v-tooltip.top-center="button.tooltip ?? button.label"
      class="btn btn-sm"
      :class="{ 'button-active': button.value === selectedButtonValue }"
      @click="emitButtonClicked(button.value)"
    >
      <i v-if="button.icon !== undefined" class="fa" :class="[button.icon]" />
      {{ button.label }}
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

export interface RadioButtonSpec {
  value: any;
  label: string;
  /** An optional FontAwesome icon class, e.g. "fa-folder-open-o" */
  icon?: string;
  /** Tooltip defaults to label if omitted */
  tooltip?: string;
}

export default defineComponent({
  name: 'RadioButtonGroup',
  emits: ['button-clicked'],
  props: {
    selectedButtonValue: {
      type: [String, Number, Boolean] as PropType<any>,
      default: null,
    },
    buttons: {
      type: Array as PropType<RadioButtonSpec[]>,
      default: [],
    },
  },
  setup(props, { emit }) {
    return {
      emitButtonClicked: (value: any) => {
        emit('button-clicked', value);
      },
    };
  },
});
</script>

<style lang="scss" scoped>
.radio-button-group-container {
  display: flex;
  border-radius: 3px;
  overflow: hidden;
}

button.button-active,
button.button-active:hover {
  background: #cacbcc;
  border-color: #cacbcc;
  opacity: 1;
  box-shadow: inset 0 3px 5px rgba(0, 0, 0, 0.26);
  cursor: default;
}
</style>
