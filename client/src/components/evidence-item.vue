<template>
  <div
    class="evidence-item-container"
    @click="onClick(evidence)"
  >
    <evidence-highlights
      :evidence="evidence"
      :resource-type="resourceType"
    />
    <div class="evidence-item-metadata">
      <span>{{ metadataDisplayString }}</span>
      <small-icon-button
        v-tooltip.top="'Open source document'"
      >
        <i class="fa fa-book fa-lg" />
      </small-icon-button>
    </div>
  </div>
</template>

<script>
import EvidenceHighlights from '@/components/evidence-highlights';
import SmallIconButton from '@/components/widgets/small-icon-button';

import evidenceMetadataUtil from '@/utils/evidence-metadata-util';

export default {
  name: 'EvidenceItem',
  components: {
    EvidenceHighlights,
    SmallIconButton
  },
  props: {
    evidence: {
      type: Object,
      default: () => ({})
    },
    resourceType: {
      type: String,
      default: ''
    }
  },
  emits: [
    'click-evidence'
  ],
  computed: {
    metadataDisplayString() {
      return evidenceMetadataUtil.constructDisplayString(this.evidence);
    }
  },
  methods: {
    onClick(evidence) {
      this.$emit('click-evidence', evidence);
    }
  }
};
</script>

<style lang="scss" scoped>

.evidence-item-container {
  background: #fff;
  color: #5A5A5A;
  cursor: pointer;
  padding: 4px 8px;

  &:hover {
    color: #000;

    .evidence-item-metadata button {
      color: #000;
    }
  }
}

.evidence-item-metadata {
  margin-top: 4px;
  display: flex;
  justify-content: flex-end;

  span {
    font-style: italic;
  }

  button {
    margin-left: 8px;
  }
}

</style>
