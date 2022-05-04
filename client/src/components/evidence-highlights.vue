<template>
  <div class="evidence-highlights-container">
    <div ref="highlight" />
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { defineComponent } from 'vue';
import stringUtil from '@/utils/string-util';

export default defineComponent({
  name: 'EvidenceHighlights',
  props: {
    evidence: {
      type: Object,
      default: () => null
    },
    resourceType: {
      type: String,
      default: ''
    }
  },
  watch: {
    evidence() {
      this.refresh();
    }
  },
  mounted() {
    this.refresh();
  },
  methods: {
    refresh() {
      const evidenceContext = this.evidence.evidence_context;
      const divEl = this.$refs.highlight as HTMLDivElement;

      if (!_.isEmpty(evidenceContext) && !_.isEmpty(evidenceContext.text)) {
        let text = evidenceContext.text;
        text = stringUtil.cleanTextFragment(text);

        if (!_.isEmpty(evidenceContext.agents_text)) {
          let selectedIdx = -1;
          if (this.resourceType === 'subj') {
            selectedIdx = 0;
          } else if (this.resourceType === 'obj') {
            selectedIdx = 1;
          }

          evidenceContext.agents_text.forEach((word: string, idx: number) => {
            let classNames = 'highlight';
            if (selectedIdx === idx) {
              classNames += ' selected-highlight';
            }
            const token = word;
            const hElement = `<span class="${classNames}">${token}</span>`;
            text = text.replace(token, hElement);
          });
        }

        if (!_.isEmpty(evidenceContext.hedging_words)) {
          evidenceContext.hedging_words.forEach((word: string) => {
            const token = word;
            const hElement = `<span class='highlight hedging-highlight'>${token}</span>`;
            text = text.replace(token, hElement);
          });
        }

        if (!_.isEmpty(evidenceContext.negation_words)) {
          evidenceContext.negation_words.forEach((word: string) => {
            const token = word;
            const hElement = `<span class='highlight negation-highlight'>${token}</span>`;
            text = text.replace(token, hElement);
          });
        }
        divEl.innerHTML = text;
      } else {
        divEl.innerHTML = '';
      }
    }
  }
});
</script>

<style lang='scss' scoped>

.evidence-highlights-container {
  :deep(.highlight) {
    font-weight: 800;
  }
  :deep(.negation-highlight) {
    border-bottom:3px red dashed;
    display: inline-block;
    line-height: 0.85;
  }
  :deep(.hedging-highlight) {
    background-color: #BEBEBE;
    font-style: italic;
  }
  :deep(.selected-highlight) {
    background-color: #B6D8FC;
  }
}
</style>
