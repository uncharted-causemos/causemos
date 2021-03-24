<template>
  <collapsible-item
    :override="expandAll"
    class="statements-container">
    <template
      #controls
      class="button-column">
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
    <template
      #title
      class="title-slot-container">
      <div class="factor-title-group">
        <div
          v-tooltip.top="item.meta.subj.factor"
          class="row-content-ellipsis">
          <i
            :class="polarityClass(item.meta.subj_polarity)"
            class="polarity-factor"
          />
          <span :class="{ 'highlights': item.meta.subj_factor_highlight, '': !item.meta.subj_factor_highlight }"> {{ item.meta.subj.factor }} </span>
        </div>
        <div
          v-tooltip.top="item.meta.obj.factor"
          class="row-content-ellipsis lower-row">
          <i
            :class="polarityClass(item.meta.obj_polarity)"
            class="polarity-factor"
          />
          <span :class="{ 'highlights': item.meta.obj_factor_highlight, '': !item.meta.obj_factor_highlight }"> {{ item.meta.obj.factor }} </span>
        </div>
      </div>
      <div
        v-if="showCurationActions"
        class="button-column"
      >
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
        v-if="showCurationActions && item.meta.state !== CURATION_STATES.VETTED && item.meta.polarity !== STATEMENT_POLARITY.UNKNOWN"
        v-tooltip.top="'Vet evidence'"
        :use-white-bg="true"
        @click.stop="vet(item)"
      >
        <i class="fa fa-check-circle fa-lg" />
      </small-icon-button>

      <small-icon-button
        v-if="showCurationActions && item.meta.state === CURATION_STATES.VETTED && item.meta.polarity !== STATEMENT_POLARITY.UNKNOWN"
        v-tooltip.top="'Vetted evidence'"
        :use-white-bg="true"
        class="vetted"
      >
        <i class="fa fa-check-circle fa-lg" />
      </small-icon-button>

      <small-icon-button
        v-if="showCurationActions"
        v-tooltip.top="'Discard'"
        :use-white-bg="true"
        @click.stop="discardStatements(item)"
      >
        <i class="fa fa-trash fa-lg" />
      </small-icon-button>
    </template>
    <template #content>
      <div
        v-for="(statement, statIdx) of item.dataArray"
        :key="statIdx"
        class="statement-item">
        <evidence-item
          v-for="(evidence, sentIdx) of statement.evidence"
          :key="sentIdx"
          class="evidence-sentence"
          :evidence="evidence"
          @click-evidence="clickEvidence(evidence.document_context)"
        />
      </div>
    </template>
  </collapsible-item>
</template>

<script>
import CollapsibleItem from '@/components/drilldown-panel/collapsible-item';
import { CORRECTION_TYPES, CURATION_STATES } from '@/utils/correction-util';
import EvidenceItem from '@/components/evidence-item';
import SmallIconButton from '@/components/widgets/small-icon-button';
import polarityUtil, { STATEMENT_POLARITY } from '@/utils/polarity-util';

/* A subcomponent to display evidence detail for evidence-pane */
export default {
  name: 'EvidenceGroup',
  components: {
    CollapsibleItem,
    EvidenceItem,
    SmallIconButton
  },
  props: {
    item: {
      type: Object,
      default: () => ({})
    },
    expandAll: {
      type: Object,
      default: () => null
    },
    activeItem: {
      type: Object,
      default: () => null
    },
    activeCorrection: {
      type: Number,
      default: () => null
    },
    showCurationActions: {
      type: Boolean,
      default: true
    }
  },
  computed: {
    subjCorrectionClass() {
      return this.hasActiveCorrection(this.item, CORRECTION_TYPES.ONTOLOGY_SUBJ) ? 'active' : '';
    },
    objCorrectionClass() {
      return this.hasActiveCorrection(this.item, CORRECTION_TYPES.ONTOLOGY_OBJ) ? 'active' : '';
    },
    polarityCorrectionClass() {
      return this.hasActiveCorrection(this.item, CORRECTION_TYPES.POLARITY) ? 'active' : '';
    }
  },
  created() {
    this.CORRECTION_TYPES = CORRECTION_TYPES;
    this.CURATION_STATES = CURATION_STATES;
    this.STATEMENT_POLARITY = STATEMENT_POLARITY;
  },
  methods: {
    // Proxied actions
    toggle(item) {
      this.$emit('toggle', item);
    },
    discardStatements(v) {
      this.$emit('discard-statements', v);
    },
    openEditor(item, type) {
      this.$emit('open-editor', { item, type });
    },
    vet(item) {
      this.$emit('vet', item);
    },
    clickEvidence(documentMeta) {
      this.$emit('click-evidence', documentMeta);
    },

    // States
    polarityClass(polarity) {
      return polarityUtil.polarityClass(polarity);
    },
    statementPolarityColor(statementPolarity) {
      return polarityUtil.statementPolarityColor(statementPolarity);
    },
    hasActiveCorrection(item, correctionType) {
      return this.activeCorrection === correctionType && this.activeItem === item;
    }
  }
};


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
  color: #D4D4D4;
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
}

.factor-title-group, .button-column {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.button-column > *:not(:first-child) {
  margin-top: 4px;
}

.title-slot-container {
  align-items: center;

  &:not(:hover) button.active {
    // When a factor regrounding button is clicked, it turns
    // black until the dialog is closed
    color: #000;
  }
}

.highlights {
  font-weight: 800;
  background-color: #B6D8FC;
}


</style>
