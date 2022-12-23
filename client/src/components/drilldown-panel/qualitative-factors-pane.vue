<template>
  <div class="factors-container">
    <modal-document
      v-if="!!documentModalData"
      :document-id="documentModalData.doc_id"
      :text-fragment="textFragment"
      @close="documentModalData = null"
    />
    <div class="pane-summary">
      {{ ontologyFormatter(selectedItem.concept) }}
      <i
        class="fa fa-fw fa-pencil"
        @click="renameNode"
      ></i>
    </div>

    <div v-if="selectedItem.components.length > 0">
      <div class="qual-pane-summary">
        Concepts & Datacubes ({{selectedItem.components.length}})
        <i
          class="icon-centered unit-width fa fa-fw"
          :class="{
            'fa-angle-down': showComponents,
            'fa-angle-right': !showComponents
          }"
          :onClick="toggleComponents"
        />
      </div>
      <div v-if="showComponents">
        <div v-for="component in selectedItem.components" :key="component">
          {{ ontologyFormatter(component) }}
        </div>
      </div>
    </div>

    <div v-if="similarConcepts.length > 0">
      <div class="qual-pane-summary">
        Similar Concepts ({{similarConcepts.length}})
        <i
          class="icon-centered unit-width fa fa-fw"
          :class="{
            'fa-angle-down': showSimilarConcepts,
            'fa-angle-right': !showSimilarConcepts
          }"
          :onClick="toggleSimilarConcepts"
        />
      </div>
      <div v-if="showSimilarConcepts">
        <div v-for="sc in similarConcepts" :key="sc.concept" class="inline-group-justified">
          {{ ontologyFormatter(sc.concept) }}
          <div
            v-tooltip.top="'Add ' + sc.concept"
            @click="addToCag(sc.concept)"
          >
            <i
              class="fa fa-plus concept-examples-icon" />
          </div>
        </div>
      </div>
    </div>

    <div class="qual-pane-summary">
      Documents Grouped by {{ factorCount }} Factor(s)
    </div>
    <collapsible-list-header
      @expand-all="expandAll={value: true}"
      @collapse-all="expandAll={value: false}"
    >
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
    </collapsible-list-header>
    <ontology-editor
      v-if="currentItem === null && activeCorrection === CORRECTION_TYPES.ONTOLOGY_ALL"
      :concept="selectedItem.concept"
      :suggestions="suggestions"
      @select="confirmUpdateGrounding(null, selectedItem.concept, $event)"
      @close="closeEditor" />
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
          <template #title>
            <div
              v-tooltip.top="value.key"
              class="factor-title overflow-ellipsis">
              {{ value.key }}
            </div>
            <small-icon-button
              class="small-icon-button"
              v-tooltip.top="'Select a different concept'"
              :use-white-bg="true"
              @click.stop="openEditor(value, CORRECTION_TYPES.ONTOLOGY_ALL)"
            >
              <i class="fa fa-sitemap fa-lg" />
            </small-icon-button>
            <small-icon-button
              class="small-icon-button"
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
              :key="statementIdx">
              <evidence-item
                v-for="(evidence, sentIdx) of statement.evidence"
                :key="sentIdx"
                :evidence="evidence"
                :resource-type="statement.subj.concept === selectedItem.concept ? 'subj' : 'obj'"
                @click-evidence="openDocumentModal(evidence)"
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
import {
  getFactorConceptSuggestions,
  groupByConceptFactor,
  discardStatements,
  updateStatementsFactorGrounding,
  getFactorGroundingRecommendations,
  getSimilarConcepts,
  CORRECTION_TYPES
} from '@/services/curation-service';
import ModalDocument from '@/components/modals/modal-document';
import EvidenceItem from '@/components/evidence-item';
import CollapsibleItem from '@/components/drilldown-panel/collapsible-item';
import OntologyEditor from '@/components/editors/ontology-editor';
import MessageDisplay from '@/components/widgets/message-display';
import SmallIconButton from '@/components/widgets/small-icon-button';
import ModalConfirmation from '@/components/modals/modal-confirmation';
import numberFormatter from '@/formatters/number-formatter';
import messagesUtil from '@/utils/messages-util';
import { TYPE } from 'vue-toastification';
import CollapsibleListHeader from '@/components/drilldown-panel/collapsible-list-header.vue';
const CORRECTIONS = messagesUtil.CORRECTIONS;
const SIDE_PANEL = messagesUtil.SIDE_PANEL;
const SERVICE_NOT_AVAILABLE = messagesUtil.SERVICE_NOT_AVAILABLE;

export default {
  name: 'QualitativeFactorsPane',
  components: {
    EvidenceItem,
    CollapsibleItem,
    ModalDocument,
    OntologyEditor,
    MessageDisplay,
    SmallIconButton,
    ModalConfirmation,
    CollapsibleListHeader
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
    textFragment: null,
    summaryData: { children: [], meta: { checked: false } },
    CORRECTION_TYPES: CORRECTION_TYPES,
    loadingMessage: 'Loading factors...',
    expandAll: null,
    showConfirmCurationModal: false,
    curationConfirmedCallback: () => null,
    messageNoData: SIDE_PANEL.FACTORS_NO_DATA,
    suggestions: [],
    similarConcepts: [],
    showComponents: true,
    showSimilarConcepts: true
  }),
  computed: {
    numSelectedItems: function() {
      return this.summaryData.children.filter(d => d.meta.checked === true).length;
    },
    factorCount() {
      return this.summaryData.children.length;
    }
  },
  emits: ['updated-relations', 'add-to-CAG', 'rename-node'],
  watch: {
    statements(n, o) {
      if (_.isEqual(n, o)) return;
      this.refresh();
    },
    selectedItem() {
      if (!this.selectedItem) return;
      this.refresh();
    }
  },
  mounted() {
    this.refresh();
  },
  methods: {
    numberFormatter,
    initializeData() {
      this.similarConcepts = [];
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

      // for each component concept get similar concepts
      const allSimilarConcepts = this.selectedItem.components.map(concept => getSimilarConcepts(this.project, concept));
      Promise.all(allSimilarConcepts).then((values) => {
        const allSc = values.reduce((acc, val) => acc.concat(val.similar_concepts), []);
        // filter those that match the existing concepts
        this.similarConcepts = allSc.filter(sc => !this.selectedItem.components.includes(sc.concept));
      });
    },
    openDocumentModal(evidence) {
      this.documentModalData = evidence.document_context;
      this.textFragment = evidence.evidence_context.text;
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
        this.toaster(CORRECTIONS.SUCCESSFUL_CORRECTION, TYPE.SUCCESS, false);
      } else {
        this.toaster(CORRECTIONS.ERRONEOUS_CORRECTION, TYPE.INFO, true);
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

      const edgeMap = new Map();
      const keyFn = (s, t) => `${s}///${t}`;
      const process = (statements) => {
        statements.forEach(statement => {
          let key = '';
          if (statement.subj.concept === curGrounding) {
            key = keyFn(newGrounding, statement.obj.concept);
          } else {
            key = keyFn(statement.subj.concept, newGrounding);
          }
          if (!edgeMap.has(key)) {
            edgeMap.set(key, []);
          }
          edgeMap.get(key).push(statement.id);
        });
      };

      if (item !== null) {
        statementIds = item.dataArray.map(statement => statement.id);
        process(item.dataArray);
      } else {
        const selectedItems = this.summaryData.children.filter(d => d.meta.checked === true);
        selectedItems.forEach(d => {
          statementIds = statementIds.concat(d.dataArray.map(statement => statement.id));
          process(d.dataArray);
        });
      }

      const updatedRelations = [];
      for (const [k, v] of edgeMap) {
        const [source, target] = k.split('///');
        updatedRelations.push({
          source,
          target,
          reference_ids: v
        });
      }
      this.$emit('updated-relations', updatedRelations);

      // Get factor recommendations first
      if (item !== null) { // FIXME: Just show factor recommendations for a single factor regrounding for now.
        const result = await getFactorGroundingRecommendations(this.project, curGrounding, item.key);
        if (result.status === 200) {
          recommendations = result.data.recommendations;
        } else {
          this.toaster(SERVICE_NOT_AVAILABLE, TYPE.INFO, false);
        }
      }

      const result = await updateStatementsFactorGrounding(this.project, statementIds, subj, obj);
      let batchId = null;
      if (result.status === 200) {
        this.toaster(CORRECTIONS.SUCCESSFUL_CORRECTION, TYPE.SUCCESS, false);
        batchId = result.data.batchId;
      } else {
        this.toaster(CORRECTIONS.ERRONEOUS_CORRECTION, TYPE.INFO, true);
      }

      if (item !== null && !_.isEmpty(recommendations)) {
        this.$emit('show-factor-recommendations', item.key, curGrounding, newGrounding, recommendations, batchId);
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
    },
    addToCag(concept) {
      const payload = {
        nodes: [
          {
            concept,
            id: '',
            label: this.ontologyFormatter(concept),
            components: [concept]
          }
        ],
        edges: []
      };
      this.$emit('add-to-CAG', payload);
    },
    renameNode() {
      this.$emit('rename-node', this.selectedItem);
    },
    toggleComponents() {
      this.showComponents = !this.showComponents;
    },
    toggleSimilarConcepts() {
      this.showSimilarConcepts = !this.showSimilarConcepts;
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
  margin-right: 5px;
}

.small-icon-button {
  margin-right: 3px;

  &:last-child {
    margin-right: 2px;
  }
}
.inline-group-justified {
  display: inline-flex;
  justify-content: space-between;
  width: 100%;
  padding: 3px;
  &:hover {
    cursor: pointer;
    background-color: $background-light-2;
  }
}

.qual-pane-summary {
  border-top: 1px $background-light-3 solid;
  border-bottom: 1px $background-light-3 solid;
  padding: 5px 0;
  font-size: $font-size-large;
  font-weight: 600;
}
</style>
