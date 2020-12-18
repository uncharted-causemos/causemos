<template>
  <span v-tooltip="tooltipText"> {{ displayText }} </span>
</template>

<script>
import StringUtil from '@/utils/string-util';

export default {
  name: 'TextDisplay',
  props: {
    text: {
      type: String,
      default: ''
    },
    max: {
      type: Number,
      default: 20
    }
  },
  computed: {
    displayText: function() {
      return StringUtil.truncateString(this.text, this.max);
    },
    tooltipText: function() {
      if (this.text.length > this.max) return this.text;
      return 0; // return a falsy value to disable tooltip
    }
  }
};
</script>
