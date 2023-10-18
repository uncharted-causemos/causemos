<template>
  <div class="radio-button-group-container">
    <button
      v-for="button of buttons"
      :key="button.value"
      :disabled="button.isDisabled || button.value === selectedButtonValue"
      v-tooltip="getTooltip(button)"
      class="btn btn-sm btn-default"
      :class="{ 'button-active': button.value === selectedButtonValue }"
      @click="emit('button-clicked', button.value)"
    >
      <i v-if="button.icon !== undefined" class="fa" :class="[button.icon]" />
      {{ button.label }}
    </button>
  </div>
</template>

<script lang="ts" setup>
export interface RadioButtonSpec {
  value: any;
  label: string;
  /** An optional FontAwesome icon class, e.g. "fa-folder-open-o" */
  icon?: string;
  /** Tooltip defaults to label if omitted */
  tooltip?: string;
  isDisabled?: boolean;
}

const emit = defineEmits<{ (e: 'button-clicked', value: any): void }>();
defineProps<{
  selectedButtonValue: string | number | boolean;
  buttons: RadioButtonSpec[];
}>();

const getTooltip = (button: RadioButtonSpec) => {
  // If the spec specifies a tooltip, display that.
  if (button.tooltip !== undefined) return button.tooltip;
  // Otherwise, display the button label for long labels, since they might be cut off.
  if (button.label.length > 15) return button.label;
  // Otherwise, don't show a tooltip
  return null;
};
</script>

<style lang="scss" scoped>
@import '@/styles/common';
.radio-button-group-container {
  display: flex;
  overflow: hidden;
}

$border-radius: 3px;
button.btn-default {
  border-radius: 0;

  &:first-child {
    border-top-left-radius: $border-radius;
    border-bottom-left-radius: $border-radius;
  }

  &:not(:first-child) {
    border-left-width: 0;
  }

  &:last-child {
    border-top-right-radius: $border-radius;
    border-bottom-right-radius: $border-radius;
  }
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
