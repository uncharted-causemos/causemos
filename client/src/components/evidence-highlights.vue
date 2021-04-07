<template>
  <div class="evidence-highlights-container">
    <div ref="highlight" />
  </div>
</template>

<script>
import _ from 'lodash';
import stringUtil from '@/utils/string-util';

export default {
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

          evidenceContext.agents_text.forEach((word, idx) => {
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
          evidenceContext.hedging_words.forEach(word => {
            const token = word;
            const hElement = `<span class='highlight hedging-highlight'>${token}</span>`;
            text = text.replace(token, hElement);
          });
        }

        if (!_.isEmpty(evidenceContext.negation_words)) {
          evidenceContext.negation_words.forEach(word => {
            const token = word;
            const hElement = `<span class='highlight negation-highlight'>${token}</span>`;
            text = text.replace(token, hElement);
          });
        }
        this.$refs.highlight.innerHTML = text;
      } else {
        this.$refs.highlight.innerHTML = this.text;
      }
    }
  }
};
</script>

<style lang='scss' scoped>

.evidence-highlights-container {
  ::v-deep(.highlight) {
    font-weight: 800;
  }
  ::v-deep(.negation-highlight) {
    border-bottom:3px red dashed;
    display: inline-block;
    line-height: 0.85;
  }
  ::v-deep(.hedging-highlight) {
    background-color: #BEBEBE;
    font-style: italic;
  }
  ::v-deep(.selected-highlight) {
    background-color: #B6D8FC;
  }
}
</style>
