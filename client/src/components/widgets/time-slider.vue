<template>
  <!-- TODO: Add tick styling -->
  <div class="time-slider-container">
    <div class="flex labels-container">
      <div>
        <label>Dates range from&nbsp;</label>
        <span>{{ rangeLabels[0] }}</span>
        <label>&nbsp;to&nbsp;</label>
        <span>{{ rangeLabels[1] }}</span>
      </div>
      <div>
        <label>Selected&nbsp;</label>
        <span>{{ currentDisplayValue }}</span>
      </div>
    </div>
    <input
      v-model="currentIndex"
      type="range"
      min="0"
      :max="values.length - 1"
      list="time-range-list"
    >
    <datalist id="time-range-list">
      <option
        v-for="index in values.length"
        :key="index"> {{ index }}
      </option>
    </datalist>
  </div>
</template>

<script>

export default {
  name: 'TimeSlider',
  props: {
    values: {
      type: Array,
      default: () => []
    },
    valueFormatter: {
      type: Function,
      default: v => v
    },
    rangeLabelFormatter: {
      type: Function,
      default: null // eg. ([start, end]) => [newStart, newEnd]
    }
  },
  data: () => ({
    currentIndex: 0
  }),
  computed: {
    startValue() {
      return this.values[0];
    },
    endValue() {
      return this.values[this.values.length - 1];
    },
    displayValues() {
      return this.values.map(this.valueFormatter);
    },
    rangeLabels() {
      return this.rangeLabelFormatter
        ? this.rangeLabelFormatter([this.startValue, this.endValue])
        : [this.displayValues[0], this.displayValues[this.displayValues.length - 1]];
    },
    currentDisplayValue() {
      return this.displayValues[this.currentIndex];
    }
  },
  watch: {
    currentIndex: function(n) {
      this.$emit('value-changed', Number(n));
    }
  }
};
</script>

<style>
.labels-container {
  margin-left: -35px;
  margin-right: -35px;
  justify-content: space-between
}
</style>
