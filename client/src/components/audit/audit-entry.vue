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

<script lang="ts">
import { PropType, defineComponent } from 'vue';
import { COMPACT_POLARITY } from '@/utils/polarity-util';
import HighlightValue from '@/components/audit/highlight-value.vue';
import useOntologyFormatter from '@/services/composables/useOntologyFormatter';

const POLARITY_CORRECTION_TYPES = ['factor_polarity'];

type Factor = {
  subj: { polarity: '-1' | '0' | '1'; concept: string };
  obj: { polarity: '-1' | '0' | '1'; concept: string };
};

export default defineComponent({
  name: 'AuditEntry',
  components: {
    HighlightValue,
  },
  setup() {
    return {
      COMPACT_POLARITY,
      ontologyFormatter: useOntologyFormatter(),
    };
  },
  props: {
    displayValues: {
      type: Object as PropType<Factor>,
      default: () => ({}),
    },
    compareValues: {
      type: Object as PropType<Factor>,
      default: () => ({}),
    },
    updateType: {
      type: String,
      required: true,
    },
  },
  computed: {
    isPolarityUpdate(): boolean {
      return POLARITY_CORRECTION_TYPES.includes(this.updateType);
    },
  },
});
</script>
