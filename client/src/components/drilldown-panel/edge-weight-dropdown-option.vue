<template>
  <div class="dropdown-option">
    <i
      class="fa fa-fw"
      :class="'fa-circle' + (value !== selectedValue ? '-o' : '')"
    />
    <div style="display: flex; flex-direction: column">
      <div v-if="isInferred" class="inferred-label">Inferred</div>
      <span>
        {{ label }}
        <span v-if="detailedValue" class="secondary">
          ({{ detailedValue }})
        </span>
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
export default defineComponent({
  name: 'EdgeWeightDropdownOption',
  props: {
    value: {
      type: [String, Number] as PropType<string | number>,
      required: true
    },
    detailedValue: {
      type: String as PropType<string | null>,
      default: null
    },
    selectedValue: {
      type: [String, Number] as PropType<string | number>,
      required: true
    },
    label: {
      type: String,
      required: true
    },
    isInferred: {
      type: Boolean,
      default: false
    }
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.dropdown-option {
  display: flex;
  align-items: center;
  gap: 5px;
}

.secondary {
  color: #888;
}

.inferred-label {
  @include header-secondary;
  font-size: $font-size-small;
}
</style>
