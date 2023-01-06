<template>
  <div class="highlight-container">
    <div ref="highlightRef" />
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { defineComponent, ref, Ref } from 'vue';

export default defineComponent({
  name: 'HighlightText',
  props: {
    text: {
      type: String,
      default: null,
    },
    highlights: {
      type: Array,
      default: () => [],
    },
  },
  watch: {
    text() {
      this.refresh();
    },
    highlight() {
      this.refresh();
    },
  },
  setup() {
    const highlightRef = ref(null) as Ref<HTMLDivElement | null>;

    return {
      highlightRef,
    };
  },
  mounted() {
    this.refresh();
  },
  methods: {
    refresh() {
      if (!this.highlightRef) return;
      if (_.isEmpty(this.text) === false && _.isEmpty(this.highlights) === false) {
        let text = this.text;

        this.highlights.forEach((high: any) => {
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
            hElement = `<span class='highlight' style="background:#FEFE00">${token}</span>`;
          } else {
            hElement = `<span class='highlight' style='color:${color}'>${token}</span>`;
          }
          const regex = new RegExp(token, 'gi');
          text = text.replace(regex, hElement);
        });
        this.highlightRef.innerHTML = text;
      } else {
        this.highlightRef.innerHTML = this.text;
      }
    },
  },
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.highlight {
  font-weight: 800;
}
.highlight-container {
  padding: 5px;
}
</style>
