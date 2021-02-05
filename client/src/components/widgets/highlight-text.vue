<template>
  <div class="highlight-container">
    <div ref="highlight" />
  </div>
</template>

<script>
import _ from 'lodash';

export default {
  name: 'HighlightText',
  props: {
    text: {
      type: String,
      default: null
    },
    highlights: {
      type: Array,
      default: () => []
    }
  },
  watch: {
    highlight() {
      this.refresh();
    }
  },
  mounted() {
    this.refresh();
  },
  methods: {
    refresh() {
      if (_.isEmpty(this.text) === false && _.isEmpty(this.highlights) === false) {
        let text = this.text;

        this.highlights.forEach(high => {
          let token = null;
          let color = null;
          if (typeof high === 'object') {
            token = high.token;
            color = high.color;
          } else {
            token = high;
          }

          let hElement = null;
          if (_.isNil(color)) {
            hElement = `<span class='highlight'>${token}</span>`;
          } else {
            hElement = `<span class='highlight' style='color:${color}'>${token}</span>`;
          }
          const regex = new RegExp(token, 'gi');
          text = text.replace(regex, hElement);
        });

        this.$refs.highlight.innerHTML = text;
      } else {
        this.$refs.highlight.innerHTML = this.text;
      }
    }
  }
};
</script>

<style lang='scss' scoped>
@import "~styles/variables";

.highlight {
  font-weight: 800;
}
.highlight-container {
  color: $label-color;
  padding: 5px;
}
</style>
