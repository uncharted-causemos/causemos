<template>
  <div
    class="evidence-item-container"
  >
    <evidence-highlights
      :evidence="evidence"
      :resource-type="resourceType"
    />
    <div class="evidence-item-metadata">
      <small-icon-button
        class="edit"
        v-tooltip.top="'Edit document info'"
      >
        <i class="fa fa-fw fa-lg fa-edit" />
      </small-icon-button>
      <div class="doc-title">{{ metadataDisplayString }}</div>
      <small-icon-button
        class="open"
        v-tooltip.top="'Open source document'"
        @click="onClick(evidence)"
      >
        <i class="fa fa-fw fa-lg"
           :class="fileIcon" />
      </small-icon-button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import EvidenceHighlights from '@/components/evidence-highlights.vue';
import SmallIconButton from '@/components/widgets/small-icon-button.vue';
import evidenceMetadataUtil from '@/utils/evidence-metadata-util';
import { Evidence } from '@/types/Statement';

export default defineComponent({
  name: 'EvidenceItem',
  components: {
    EvidenceHighlights,
    SmallIconButton
  },
  props: {
    evidence: {
      type: Object as PropType<Evidence>,
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
    metadataDisplayString(): string {
      return evidenceMetadataUtil.constructDisplayString(this.evidence);
    },
    fileIcon(): string {
      const type = this.evidence.document_context.file_type || '';
      if (['application/pdf', 'pdf'].includes(type)) {
        return 'fa-file-pdf-o';
      }
      return 'fa-file-text-o';
    }
  },
  methods: {
    onClick(evidence: Evidence) {
      this.$emit('click-evidence', evidence);
    }
  }
});
</script>

<style lang="scss" scoped>

.evidence-item-container {
  background: #fff;
  color: #5A5A5A;
  cursor: pointer;
  padding: 4px 8px;
  border-bottom: 1px solid #e5e5e5;
  margin: 2px;

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
  align-content: stretch;
  align-items: flex-end;

  .doc-title {
    font-style: italic;
    flex: 1 1 auto;
    text-align: right;
    margin: 0 8px;
    overflow: hidden;
  }
}

</style>
