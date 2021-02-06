<template>
  <div
    v-if="hasOptions"
    class="indicator-metadata-row-container"
  >
    <label>{{ rowLabel }}</label>
    <span v-if="options.length === 1">
      {{ options[0] === '' ? 'MISSING' : options[0] }}
    </span>
    <select
      v-else
      class="form-control input-sm"
      :value="value"
      @input="$emit('input', $event.target.value)"
    >
      <option
        v-for="option in options"
        :key="option"
        :value="option"
      >
        {{ option }}
      </option>
    </select>
  </div>
</template>

<script>
export default {
  name: 'IndicatorMetadataRow',
  props: {
    rowLabel: {
      type: String,
      required: true
    },
    options: {
      type: Array,
      required: true
    },
    value: {
      type: [String, Number],
      default: null
    }
  },
  computed: {
    hasOptions() {
      return this.options.length > 0;
    }
  }
};
</script>

<style lang="scss" scoped>

.indicator-metadata-row-container {
  display: flex;
  align-items: center;
  margin-bottom: 5px;

  label {
    min-width: 160px;
    padding-right: 5px;
  }
}

</style>
