<template>
  <collapsible-item :override="expandAll" class="statements-container">
    <template #controls class="button-column">
      <i
        v-if="showCurationActions"
        class="fa fa-lg fa-fw"
        :class="{ 'fa-check-square-o': item.meta.checked, 'fa-square-o': !item.meta.checked }"
        @click="toggle(item)"
      />
      <small-icon-button
        v-tooltip.top="`Correct polarities and reverse relation`"
        :use-white-bg="true"
        :style="statementPolarityColor(item.meta.polarity)"
        class="polarity-correction"
        :class="[polarityCorrectionClass]"
        :disabled="!showCurationActions"
        @click.stop="openEditor(item, CORRECTION_TYPES.POLARITY)"
      >
        <i class="fa fa-long-arrow-right fa-lg" />
      </small-icon-button>
    </template>
    <template #title>
      <div class="factor-title-group">
        <div v-tooltip.top="item.meta.subj.factor" class="overflow-ellipsis">
          <i :class="polarityClass(item.meta.subj_polarity)" class="polarity-factor" />
          <span
            :class="{
              highlights: item.meta.subj_factor_highlight,
              '': !item.meta.subj_factor_highlight,
            }"
          >
            {{ item.meta.subj.factor }}
          </span>
        </div>
        <div v-tooltip.top="item.meta.obj.factor" class="overflow-ellipsis lower-row">
          <i :class="polarityClass(item.meta.obj_polarity)" class="polarity-factor" />
          <span
            :class="{
              highlights: item.meta.obj_factor_highlight,
              '': !item.meta.obj_factor_highlight,
            }"
          >
            {{ item.meta.obj.factor }}
          </span>
        </div>
      </div>
      <div v-if="showCurationActions" class="button-column right-margin">
        <small-icon-button
          v-tooltip.top="'Select a different cause concept'"
          :use-white-bg="true"
          :class="[subjCorrectionClass]"
          @click.stop="openEditor(item, CORRECTION_TYPES.ONTOLOGY_SUBJ)"
        >
          <i class="fa fa-sitemap fa-lg" />
        </small-icon-button>
        <small-icon-button
          v-tooltip.top="'Select a different effect concept'"
          :use-white-bg="true"
          :class="[objCorrectionClass]"
          class="lower-row"
          @click.stop="openEditor(item, CORRECTION_TYPES.ONTOLOGY_OBJ)"
        >
          <i class="fa fa-sitemap fa-lg" />
        </small-icon-button>
      </div>
      <small-icon-button
        class="right-margin"
        v-if="
          showCurationActions &&
          item.meta.state !== CURATION_STATES.VETTED &&
          item.meta.polarity !== STATEMENT_POLARITY.UNKNOWN
        "
        v-tooltip.top="'Vet evidence'"
        :use-white-bg="true"
        @click.stop="vet(item)"
      >
        <i class="fa fa-check-circle fa-lg" />
      </small-icon-button>

      <small-icon-button
        v-if="
          showCurationActions &&
          item.meta.state === CURATION_STATES.VETTED &&
          item.meta.polarity !== STATEMENT_POLARITY.UNKNOWN
        "
        v-tooltip.top="'Vetted evidence'"
        :use-white-bg="true"
        class="vetted right-margin"
      >
        <i class="fa fa-check-circle fa-lg" />
      </small-icon-button>

      <small-icon-button
        class="right-margin"
        v-if="showCurationActions"
        v-tooltip.top="'Discard'"
        :use-white-bg="true"
        @click.stop="discardStatements(item)"
      >
        <i class="fa fa-trash fa-lg" />
      </small-icon-button>
    </template>
    <template #content>
      <div v-for="(statement, statIdx) of item.dataArray" :key="statIdx">
        <evidence-item
          v-for="(evidence, sentIdx) of statement.evidence"
          :key="sentIdx"
          :evidence="evidence"
          @click-evidence="clickEvidence(evidence)"
        />
      </div>
    </template>
  </collapsible-item>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import CollapsibleItem from '@/components/drilldown-panel/collapsible-item.vue';
import EvidenceItem from '@/components/evidence-item.vue';
import SmallIconButton from '@/components/widgets/small-icon-button.vue';
import { CORRECTION_TYPES, CURATION_STATES } from '@/services/curation-service';
import polarityUtil, { STATEMENT_POLARITY } from '@/utils/polarity-util';
import { StatementGroup, Evidence } from '@/types/Statement';

/* A subcomponent to display evidence detail for evidence-pane */
export default defineComponent({
  name: 'EvidenceGroup',
  components: {
    CollapsibleItem,
    EvidenceItem,
    SmallIconButton,
  },
  props: {
    item: {
      type: Object as PropType<StatementGroup>,
      default: () => ({}),
    },
    expandAll: {
      type: Object as PropType<{ value: boolean }>,
      default: () => null,
    },
    activeItem: {
      type: Object,
      default: () => null,
    },
    activeCorrection: {
      type: Number,
      default: () => null,
    },
    showCurationActions: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['toggle', 'discard-statements', 'open-editor', 'vet', 'click-evidence'],
  setup() {
    return {
      CORRECTION_TYPES,
      CURATION_STATES,
      STATEMENT_POLARITY,
    };
  },
  computed: {
    subjCorrectionClass(): string {
      return this.hasActiveCorrection(this.item, CORRECTION_TYPES.ONTOLOGY_SUBJ) ? 'active' : '';
    },
    objCorrectionClass(): string {
      return this.hasActiveCorrection(this.item, CORRECTION_TYPES.ONTOLOGY_OBJ) ? 'active' : '';
    },
    polarityCorrectionClass(): string {
      return this.hasActiveCorrection(this.item, CORRECTION_TYPES.POLARITY) ? 'active' : '';
    },
  },
  methods: {
    // Proxied actions
    toggle(item: StatementGroup) {
      this.$emit('toggle', item);
    },
    discardStatements(item: StatementGroup) {
      this.$emit('discard-statements', item);
    },
    openEditor(item: StatementGroup, type: CORRECTION_TYPES) {
      this.$emit('open-editor', { item, type });
    },
    vet(item: StatementGroup) {
      this.$emit('vet', item);
    },
    clickEvidence(evidence: Evidence) {
      this.$emit('click-evidence', evidence);
    },

    // States
    polarityClass(polarity: number) {
      return polarityUtil.polarityClass(polarity);
    },
    statementPolarityColor(statementPolarity: number) {
      return polarityUtil.statementPolarityColor(statementPolarity);
    },
    hasActiveCorrection(item: StatementGroup, correctionType: CORRECTION_TYPES) {
      return this.activeCorrection === correctionType && this.activeItem === item;
    },
  },
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.statements-container {
  .polarity-factor {
    font-size: 10px;
    padding-right: 5px;
  }
}

button.white-bg.vetted {
  cursor: default;
  background: none;

  i {
    color: $vetted-state-dark;
  }
}

.statements-container {
  background: #f2f2f2;
}

.statements-container:not(:hover) button.white-bg,
.statements-container button.white-bg:disabled {
  // When not hovering over a row, or when a button is disabled,
  // remove its white rounded rectangle background and fade its colour
  color: #d4d4d4;
  background: none;
}

.lower-row {
  margin-top: 4px;
}

button.polarity-correction {
  margin-left: 4px;
  width: 16px;

  i {
    margin-left: 1px;
  }
}

.factor-title-group {
  flex: 1;
  margin-right: 5px;
}

.factor-title-group,
.button-column {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.button-column > *:not(:first-child) {
  margin-top: 4px;
}

.button-column button.active:not(:hover) {
  // When a factor regrounding button is clicked, it turns
  // black until the dialog is closed
  color: #000;
}

.title-slot-container {
  align-items: center;
}

.highlights {
  font-weight: 800;
  background-color: #b6d8fc;
}

.right-margin {
  margin-right: 3px;

  &:last-child {
    margin-right: 2px;
  }
}
</style>
