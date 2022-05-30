<template>
  <div>
    <div>{{label}}</div>
    <input
      type="number"
      class="form-control input-sm"
      :value="modelValue"
      @input="update"
    />
    <span
      v-if="unit.length > 5"
      v-tooltip.right="unit"
      >
      {{ unit.slice(0,3) }}
    </span>
    <span v-else>
      {{ unit }}
    </span>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

export default defineComponent({
  name: 'ChartRangeInput',
  props: {
    unit: {
      type: String as PropType<string>,
      default: ''
    },
    label: {
      type: String as PropType<string>,
      default: ''
    },
    modelValue: {
      type: Number as PropType<Number>,
      default: 0
    }
  },
  emits: ['update:modelValue'],
  methods: {
    update(event: Event) {
      if (event === null || event?.target === null) return;
      const update = event.target as HTMLTextAreaElement;
      this.$emit('update:modelValue', update.value);
    }
  }

});

</script>

<style scoped lang="scss">
    .form-control {
      margin-right: 1ch;
      width: 10ch;
      display: inline;
    }
</style>
