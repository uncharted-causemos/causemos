<template>
  <div class="factors-container">
    <modal-document
      v-if="!!documentModalData"
      :document-data="documentModalData"
      @close="documentModalData = null"
    />
    <div class="pane-summary">
      {{ ontologyFormatter(selectedItem.concept) }} ({{ numberFormatter(factorCount) }})
      <i
        v-tooltip.top="compositionDefinitions"
        class="fa fa-info-circle concept-examples-icon" />
    </div>
    <div class="pane-controls">
      <div class="bulk-actions">
        <i
          class="fa fa-lg fa-fw"
          :class="{
            'fa-check-square-o': summaryData.meta.checked,
            'fa-square-o': !summaryData.meta.checked && !summaryData.isSomeChildChecked,
            'fa-minus-square-o': !summaryData.meta.checked && summaryData.meta.isSomeChildChecked
          }"
          @click="toggle(summaryData)"
        />
        <small-icon-button
          v-tooltip.top="'Select a different concept in bulk'"
          :disabled="numSelectedItems === 0"
          :has-dropdown="true"
          @click.stop="openEditor(null, CORRECTION_TYPES.ONTOLOGY_ALL)"
        >
          <i class="fa fa-sitemap fa-lg" />
        </small-icon-button>
        <small-icon-button
          v-tooltip.top="'Discard factors in bulk'"
          :disabled="numSelectedItems === 0"
          @click.stop="confirmDiscardStatements(null)"
        >
          <i class="fa fa-trash fa-lg" />
        </small-icon-button>
      </div>
      <div class="expand-collapse">
        <small-text-button
          :label="'Expand All'"
          @click="expandAll={value: true}"
        />
        <small-text-button
          :label="'Collapse All'"
          @click="expandAll={value: false}"
        />
      </div>
    </div>

    <ontology-editor
      v-if="currentItem === null && activeCorrection === CORRECTION_TYPES.ONTOLOGY_ALL"
      :concept="selectedItem.concept"
      :suggestions="suggestions"
      @select="confirmUpdateGrounding(null, selectedItem.concept, $event)"
      @close="closeEditor" />
    <hr class="pane-separator">
    <div v-if="factorCount > 0">
      <div
        v-for="value in summaryData.children"
        :key="value.key">
        <collapsible-item
          :override="expandAll"
          class="factors-container-content"
        >
          <template #controls>
            <i
              class="fa fa-lg fa-fw"
              :class="{ 'fa-check-square-o': value.meta.checked, 'fa-square-o': !value.meta.checked }"
              @click="toggle(value)"
            />
          </template>
          <template
            #title
            class="title-slot-container"
          >
            <div
              v-tooltip.top="value.key"
              class="factor-title row-content-ellipsis">
              {{ value.key }}
            </div>
            <small-icon-button
              v-tooltip.top="'Select a different concept'"
              :use-white-bg="true"
              @click.stop="openEditor(value, CORRECTION_TYPES.ONTOLOGY_ALL)"
            >
              <i class="fa fa-sitemap fa-lg" />
            </small-icon-button>
            <small-icon-button
              v-tooltip.top="'Discard factor'"
              :use-white-bg="true"
              @click.stop="confirmDiscardStatements(value)"
            >
              <i class="fa fa-trash fa-lg" />
            </small-icon-button>
          </template>
          <template #content>
            <div
              v-for="(statement, statementIdx) of value.dataArray"
              :key="statementIdx"
              class="statement-item">
              <evidence-item
                v-for="(evidence, sentIdx) of statement.evidence"
                :key="sentIdx"
                class="evidence-sentence"
                :evidence="evidence"
                :resource-type="statement.subj.concept === selectedItem.concept ? 'subj' : 'obj'"
                @click-evidence="openDocumentModal(evidence.document_context)"
              />
            </div>
          </template>
        </collapsible-item>

        <ontology-editor
          v-if="currentItem === value && activeCorrection === CORRECTION_TYPES.ONTOLOGY_ALL"
          :concept="selectedItem.concept"
          :suggestions="suggestions"
          @select="confirmUpdateGrounding(value, selectedItem.concept, $event)"
          @close="closeEditor" />
      </div>
    </div>
    <div v-else-if="numberRelationships === 0">
      <message-display :message="messageNoData" />
    </div>
    <div
      v-if="isFetchingStatements"
      class="pane-loading-message"
    >
      <i class="fa fa-spin fa-spinner pane-loading-icon" /><span>{{ loadingMessage }}</span>
    </div>
    <modal-confirmation
      v-if="showConfirmCurationModal"
      :autofocus-confirm="false"
      @confirm="curationConfirmedCallback"
      @close="closeConfirmCurationModal">
      <template #title>Confirm Curation Action</template>
      <template #message>
        <p>This action will affect the entire Knowledge Base and other CAGs that use it.</p>
        <p>Do you want to proceed?</p>
      </template>
    </modal-confirmation>
  </div>
</template>

<script>
import _ from 'lodash';
import { mapGetters } from 'vuex';
import { getFactorConceptSuggestions, groupByConceptFactor, discardStatements, updateStatementsFactorGrounding, getFactorGroundingRecommendations } from '@/services/curation-service';
import projectService from '@/services/project-service';
import ModalDocument from '@/components/modals/modal-document';
import EvidenceItem from '@/components/evidence-item';
import CollapsibleItem from '@/components/drilldown-panel/collapsible-item';
import OntologyEditor from '@/components/editors/ontology-editor';
import MessageDisplay from '@/components/widgets/message-display';
import SmallTextButton from '@/components/widgets/small-text-button';
import SmallIconButton from '@/components/widgets/small-icon-button';
import ModalConfirmation from '@/components/modals/modal-confirmation';
import ontologyFormatter from '@/formatters/ontology-formatter';
import numberFormatter from '@/formatters/number-formatter';

import messagesUtil from '@/utils/messages-util';
import { CORRECTION_TYPES } from '@/utils/correction-util';

const CORRECTIONS = messagesUtil.CORRECTIONS;
const SIDE_PANEL = messagesUtil.SIDE_PANEL;
const SERVICE_NOT_AVAILABLE = messagesUtil.SERVICE_NOT_AVAILABLE;

export default {
  name: 'FactorsPane',
  components: {
    EvidenceItem,
    CollapsibleItem,
    ModalDocument,
    OntologyEditor,
    MessageDisplay,
    SmallTextButton,
    SmallIconButton,
    ModalConfirmation
  },
  props: {
    selectedItem: {
      type: Object,
      default: null
    },
    numberRelationships: {
      type: Number,
      default: 0
    },
    statements: {
      type: Array,
      default: () => []
    },
    project: {
      type: String,
      default: null
    },
    isFetchingStatements: {
      type: Boolean,
      default: false
    },
    shouldConfirmCurations: {
      type: Boolean,
      default: false
    }
  },
  data: () => ({
    currentItem: null,
    activeCorrection: null,
    documentModalData: null,
    summaryData: { children: [], meta: { checked: false } },
    CORRECTION_TYPES: CORRECTION_TYPES,
    loadingMessage: 'Loading factors...',
    expandAll: null,
    showConfirmCurationModal: false,
    curationConfirmedCallback: () => null,
    messageNoData: SIDE_PANEL.FACTORS_NO_DATA,
    suggestions: [],
    ontologyComposition: {}
  }),
  computed: {
    ...mapGetters({
      projectMetadata: 'app/projectMetadata',
      conceptDefinitions: 'app/conceptDefinitions'
    }),
    numSelectedItems: function() {
      return this.summaryData.children.filter(d => d.meta.checked === true).length;
    },
    compositionDefinitions() {
      if (_.isEmpty(this.ontologyComposition)) return '';
      const lookup = this.conceptDefinitions;

      // FIXME: Remove when ontology versions are consolidated upstream - Mar 15, 2021
      const defn = (v) => {
        const alternate = v.replace('wm_compositional', 'wm');
        const text = (lookup[v] || lookup[alternate]) || '';
        return text;
      };

      return [
        defn(this.ontologyComposition.theme),
        defn(this.ontologyComposition.theme_property),
        defn(this.ontologyComposition.process),
        defn(this.ontologyComposition.process_property)
      ].filter(d => d !== '').join(', ');
    },
    factorCount() {
      return this.summaryData.children.length;
    }
  },
  watch: {
    statements(n, o) {
      if (_.isEqual(n, o)) return;
      this.refresh();
    },
    selectedItem() {
      if (!this.selectedItem) return;
      projectService.getProjectOntologyComposition(this.project, this.selectedItem.concept).then(d => {
        this.ontologyComposition = d;
      });
    }
  },
  mounted() {
    this.refresh();
  },
  methods: {
    ontologyFormatter,
    numberFormatter,
    initializeData() {
      this.currentItem = null;
      this.activeCorrection = null;
      this.expandAll = null;
    },
    refresh() {
      this.initializeData();
      this.summaryData = {
        children: groupByConceptFactor(this.statements, this.selectedItem.concept),
        meta: { checked: false, isSomeChildChecked: false }
      };

      projectService.getProjectOntologyComposition(this.project, this.selectedItem.concept).then(d => {
        this.ontologyComposition = d;
      });
    },
    openDocumentModal(documentMeta) {
      this.documentModalData = documentMeta;
    },
    async openEditor(item, type) {
      if (item === this.currentItem && type === this.activeCorrection) {
        this.currentItem = null;
        this.activeCorrection = null;
        return;
      }
      this.suggestions = await this.getSuggestions(item);
      this.currentItem = item;
      this.activeCorrection = type;
    },
    closeEditor() {
      this.currentItem = null;
      this.activeCorrection = null;
    },
    highlightClickedIcon: function(item) {
      return this.currentItem === item;
    },
    toggle(item) {
      // Recursive helpers
      const recursiveDown = (item, newState) => {
        item.meta.checked = newState;
        if (!item.children) return;
        item.children.forEach(child => recursiveDown(child, newState));
      };

      const recursiveUp = (item) => {
        if (!_.isEmpty(item.children)) {
          item.children.forEach(child => recursiveUp(child));
          const numChecked = item.children.filter(d => d.meta.checked === true).length;
          item.meta.checked = numChecked === item.children.length;
          item.meta.isSomeChildChecked = numChecked > 0;
        }
      };

      // Toggle on if not currently checked and no children are partially or fully checked
      //  otherwise toggle off
      item.meta.checked = !item.meta.isSomeChildChecked && !item.meta.checked;

      // Traverse down to change children, then traverse up to update parents
      recursiveDown(item, item.meta.checked);
      recursiveUp(this.summaryData);
    },
    async getSuggestions(item) {
      // Parse out statement ids
      let ids = [];
      const factors = [];
      if (item === null) {
        this.summaryData.children.filter(d => d.meta.checked === true).forEach(child => {
          ids = ids.concat(child.dataArray.map(d => d.id));
          factors.push(child.key);
        });
      } else {
        ids = item.dataArray.map(d => d.id);
        factors.push(item.key);
      }

      const suggestions = await getFactorConceptSuggestions(this.project, ids, factors);
      return suggestions;
    },
    confirmDiscardStatements(item) {
      if (!this.shouldConfirmCurations) {
        this.discardStatements(item);
        return;
      }
      this.openConfirmCurationModal(() => { this.discardStatements(item); });
    },
    async discardStatements(item) {
      let selectedItems = [];
      let statementIds = [];
      if (!_.isNil(item)) {
        selectedItems = [item];
      } else {
        selectedItems = this.summaryData.children.filter(item => item.meta.checked === true);
      }
      selectedItems.forEach(item => {
        statementIds = statementIds.concat(item.dataArray.map(statement => statement.id));
      });
      statementIds = _.uniq(statementIds);
      const updateResult = await discardStatements(this.project, statementIds);

      if (updateResult.status === 200) {
        this.toaster(CORRECTIONS.SUCCESSFUL_CORRECTION, 'success', false);
      } else {
        this.toaster(CORRECTIONS.ERRONEOUS_CORRECTION, 'error', true);
      }
    },
    confirmUpdateGrounding(item, curGrounding, newGrounding) {
      if (!this.shouldConfirmCurations) {
        this.updateGrounding(item, curGrounding, newGrounding);
        return;
      }
      this.openConfirmCurationModal(() => { this.updateGrounding(item, curGrounding, newGrounding); });
    },
    async updateGrounding(item, curGrounding, newGrounding) {
      let recommendations = [];
      let statementIds = [];

      const subj = {
        oldValue: curGrounding,
        newValue: newGrounding
      };
      const obj = {
        oldValue: curGrounding,
        newValue: newGrounding
      };

      if (item !== null) {
        statementIds = item.dataArray.map(statement => statement.id);
      } else {
        const selectedItems = this.summaryData.children.filter(d => d.meta.checked === true);
        selectedItems.forEach(d => {
          statementIds = statementIds.concat(d.dataArray.map(statement => statement.id));
        });
      }

      // Get factor recommendations first
      if (item !== null) { // FIXME: Just show factor recommendations for a single factor regrounding for now.
        const result = await getFactorGroundingRecommendations(this.project, curGrounding, item.key);
        if (result.status === 200) {
          recommendations = result.data.recommendations;
        } else {
          this.toaster(SERVICE_NOT_AVAILABLE, 'error', false);
        }
      }

      const result = await updateStatementsFactorGrounding(this.project, statementIds, subj, obj);
      if (result.status === 200) {
        this.toaster(CORRECTIONS.SUCCESSFUL_CORRECTION, 'success', false);
      } else {
        this.toaster(CORRECTIONS.ERRONEOUS_CORRECTION, 'error', true);
      }

      if (item !== null && !_.isEmpty(recommendations)) {
        this.$emit('show-factor-recommendations', { regrounding: { factor: item.key, curGrounding, newGrounding }, recommendations });
      }
    },
    openConfirmCurationModal(confirmedCallback) {
      // Store handler for when the user confirms the curation
      this.curationConfirmedCallback = () => {
        confirmedCallback();
        this.closeConfirmCurationModal();
      };
      this.showConfirmCurationModal = true;
    },
    closeConfirmCurationModal() {
      this.curationConfirmedCallback = () => null;
      this.showConfirmCurationModal = false;
    }
  }
};
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.factors-container-content {
  background: #f2f2f2;
  .highlight-container:not(:last-child) {
    border-bottom: 1px dashed #888;
  }
  .dropdown {
    max-height: 300px;
    overflow-y: scroll;
    i {
      padding: 5px;
    }
    .fa-window-close {
      position: absolute;
      top: 0;
      right: 0;
      cursor: pointer;
    }
    .dropdown-option {
      cursor: pointer;
    }
    .separator {
      margin: 5px;
    }
  }

  &:not(:hover) button.white-bg {
    color: #D4D4D4;
    background: none;
  }
}

.concept-examples-icon {
  cursor: pointer;
}

.highlight-container:not(:last-child) {
  border-bottom: 1px dashed #888;
}

.factor-title {
  flex: 1;
  min-width: 0;
}

hr.pane-separator {
  // Match other panes' spacing
  margin-bottom: 7px;
}
</style>
