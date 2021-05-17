<template>
  <span class="audit-entry">
    <highlight-value
      v-if="isPolarityUpdate"
      :display-value="COMPACT_POLARITY[displayValues.subj.polarity]"
      :compare-value="COMPACT_POLARITY[compareValues.subj.polarity]"
    />
    <highlight-value
      :display-value="ontologyFormatter(displayValues.subj.concept)"
      :compare-value="ontologyFormatter(compareValues.subj.concept)"
    />
    &nbsp;&gt;&nbsp;
    <highlight-value
      v-if="isPolarityUpdate"
      :display-value="COMPACT_POLARITY[displayValues.obj.polarity]"
      :compare-value="COMPACT_POLARITY[compareValues.obj.polarity]"
    />
    <highlight-value
      :display-value="ontologyFormatter(displayValues.obj.concept)"
      :compare-value="ontologyFormatter(compareValues.obj.concept)"
    />
  </span>
</template>

<script>
import { COMPACT_POLARITY } from '@/utils/polarity-util';
import HighlightValue from '@/components/audit/highlight-value';

const POLARITY_CORRECTION_TYPES = [
  'factor_polarity'
];
const UPDATE_GROUNDING = 'update_ontology';

const VETTING = 'vetting';

export default {
  name: 'AuditEntry',
  components: {
    HighlightValue
  },
  props: {
    displayValues: {
      type: Object,
      default: () => ({})
    },
    compareValues: {
      type: Object,
      default: () => ({})
    },
    updateType: {
      type: String,
      required: true
    }
  },
  computed: {
    showGroundingScore: function() {
      return this.updateType === UPDATE_GROUNDING || this.updateType === VETTING;
    },
    isPolarityUpdate: function() {
      return POLARITY_CORRECTION_TYPES.includes(this.updateType);
    }
  },
  created() {
    this.COMPACT_POLARITY = COMPACT_POLARITY;
  }
};
</script>
