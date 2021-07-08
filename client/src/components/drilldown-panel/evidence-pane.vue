<template>
  <div class="evidence-container">
    <modal-document
      v-if="!!documentModalData"
      :document-data="documentModalData"
      @close="documentModalData = null"
    />
    <div class="pane-summary">
      {{ ontologyFormatter(selectedRelationship.source) }}
      <i
        class="fa fa-long-arrow-right fa-lg icon"
        :style="polarityColor"
      /> &nbsp;{{ ontologyFormatter(selectedRelationship.target) }}
    </div>
    <slot />
    <div class="pane-summary">Evidence ({{ numberFormatter(evidenceCount) }})</div>
    <collapsible-list-header
      @expand-all="expandAll={value: true}"
      @collapse-all="expandAll={value: false}"
    >
      <template v-if="showCurationActions">
        <i
          class="fa fa-lg fa-fw"
          :class="{
            'fa-check-square-o': summaryData.meta.checked,
            'fa-square-o': !summaryData.meta.checked && !summaryData.meta.isSomeChildChecked,
            'fa-minus-square-o': !summaryData.meta.checked && summaryData.meta.isSomeChildChecked
          }"
          @click="toggle(summaryData)"
        />
        <small-icon-button
          v-tooltip.top="'Discard evidence in bulk'"
          :disabled="numSelectedItems === 0"
          @click="confirmDiscardStatements(null)"
        >
          <i class="fa fa-trash fa-lg" />
        </small-icon-button>
        <small-icon-button
          v-tooltip.top="'Vetting evidence in bulk'"
          :disabled="numSelectedItems === 0 || !canPerformBulkVetting"
          @click="confirmVet()"
        >
          <i class="fa fa-check-circle fa-lg" />
        </small-icon-button>
      </template>
    </collapsible-list-header>
    <div v-if="evidenceCount > 0">
      <div
        v-for="value in summaryData.children"
        :key="value.key">
        <!-- FIXME: the below v-if was an out of place fix for this UI displaying old data, should be fixed somewhere else -->
        <collapsible-item
          v-if="!isFetchingStatements"
          :default-expand="true"
          :override="override(value)"
          :style="unusedStatementsStyle(value)"
          class="polarities-grouping-container">
          <template
            v-if="showCurationActions"
            #controls>
            <i
              class="fa fa-lg fa-fw"
              :class="{
                'fa-check-square-o': value.meta.checked,
                'fa-square-o': !value.meta.checked && !value.isSomeChildChecked,
                'fa-minus-square-o': !value.meta.checked && value.meta.isSomeChildChecked
              }"
              @click="toggle(value)"
            />
          </template>
          <template
            #title
            class="polarities-grouping-title">
            <div class="grouping-title">
              {{ statementPolarityFormatter(value.key) }} {{ unusedStatementsNotice(value) }}
            </div>
            <div
              v-if="+value.key === STATEMENT_POLARITY.UNKNOWN && showCurationActions"
              class="unknown-bulk-icons">
              <i class="fa fa-question" />
              <i
                class="fa fa-caret-down"
                @click.stop="openEditor(null, CORRECTION_TYPES.POLARITY_UNKNOWN)"
              />
              <unknown-polarity-editor
                v-if="activeCorrection === CORRECTION_TYPES.POLARITY_UNKNOWN"
                @select="updateUnknownBulk($event)"
                @close="activeCorrection = null" />

            </div>
          </template>
          <template #content>
            <div
              v-for="item of value.children"
              :key="item.key"
              class="evidence-polarities">
              <evidence-group
                :expand-all="expandAll"
                :item="item"
                :active-correction="activeCorrection"
                :active-item="activeItem"
                :show-curation-actions="showCurationActions"
                @click-evidence="openDocumentModal"
                @toggle="toggle"
                @vet="confirmVet"
                @discard-statements="confirmDiscardStatements"
                @open-editor="openEditor($event.item, $event.type)" />

              <polarity-editor
                v-if="activeItem === item && activeCorrection === CORRECTION_TYPES.POLARITY"
                :item="{subj_polarity: item.meta.subj_polarity, obj_polarity: item.meta.obj_polarity}"
                @reverse-relation="confirmReverseRelation(item)"
                @select="confirmUpdatePolarity(item, $event)"
                @close="closeEditor" />
              <ontology-editor
                v-if="activeItem === item && activeCorrection === CORRECTION_TYPES.ONTOLOGY_SUBJ"
                :concept="selectedRelationship.source"
                :suggestions="suggestions"
                @select="confirmUpdateGrounding(item, selectedRelationship.source, $event, CORRECTION_TYPES.ONTOLOGY_SUBJ)"
                @close="closeEditor"
                @showCustomConcept="showCustomConcept = true"/>

              <ontology-editor
                v-if="activeItem === item && activeCorrection === CORRECTION_TYPES.ONTOLOGY_OBJ"
                :concept="selectedRelationship.target"
                :suggestions="suggestions"
                @select="confirmUpdateGrounding(item, selectedRelationship.target, $event, CORRECTION_TYPES.ONTOLOGY_OBJ)"
                @close="closeEditor"
                @showCustomConcept="showCustomConcept = true"/>

            </div>
          </template>
        </collapsible-item>
      </div>
    </div>
    <div v-else>
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
    <modal-custom-concept
      v-if="showCustomConcept"
      ref="customConcept"
      @close="showCustomConcept = false"
      @save-custom-concept="saveCustomConcept"
    />
  </div>
</template>

<script>
import _ from 'lodash';
import { CORRECTION_TYPES, getStatementConceptSuggestions, groupByPolarityAllFactors, discardStatements, vetStatements, reverseStatementsRelation, updateStatementsFactorGrounding, updateStatementsPolarity } from '@/services/curation-service';
import OntologyEditor from '@/components/editors/ontology-editor';
import PolarityEditor from '@/components/editors/polarity-editor';
import UnknownPolarityEditor from '@/components/editors/unknown-polarity-editor';
import CollapsibleListHeader from '@/components/drilldown-panel/collapsible-list-header';
import CollapsibleItem from '@/components/drilldown-panel/collapsible-item';
import EvidenceGroup from '@/components/drilldown-panel/evidence-group';
import ModalDocument from '@/components/modals/modal-document';
import SmallIconButton from '@/components/widgets/small-icon-button';
import { CORRECTIONS, CURATIONS, SIDE_PANEL } from '@/utils/messages-util';
import MessageDisplay from '@/components/widgets/message-display';
import ModalConfirmation from '@/components/modals/modal-confirmation';
import statementPolarityFormatter from '@/formatters/statement-polarity-formatter';
import numberFormatter from '@/formatters/number-formatter';
import ModalCustomConcept from '@/components/modals/modal-custom-concept';

import { STATEMENT_POLARITY, statementPolarityColor } from '@/utils/polarity-util';

export default {
  name: 'EvidencePane',
  components: {
    ModalDocument,
    CollapsibleItem,
    CollapsibleListHeader,
    PolarityEditor,
    OntologyEditor,
    UnknownPolarityEditor,
    EvidenceGroup,
    MessageDisplay,
    SmallIconButton,
    ModalConfirmation,
    ModalCustomConcept
  },
  props: {
    selectedRelationship: {
      type: Object,
      default: null,
      validator(selectedRelationship) {
        return (selectedRelationship !== undefined &&
          selectedRelationship.source !== undefined &&
          selectedRelationship.target !== undefined
        );
      }
    },
    statements: {
      type: Array,
      default: () => []
    },
    project: {
      type: String,
      default: null
    },
    showCurationActions: {
      type: Boolean,
      default: true
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
    // Input data
    activeCorrection: null,
    activeItem: null,
    documentModalData: null,

    // States
    expandAll: null,
    loadingMessage: 'Loading evidence...',
    summaryData: { children: [], meta: { checked: false } },
    messageNoData: SIDE_PANEL.EVIDENCE_NO_DATA,
    showConfirmCurationModal: false,
    curationConfirmedCallback: () => null,
    suggestions: [],
    showCustomConcept: false
  }),
  computed: {
    numSelectedItems() {
      let cnt = 0;
      this.summaryData.children.forEach(polarityGroup => {
        cnt += polarityGroup.children.filter(d => d.meta.checked === true).length;
      });
      return cnt;
    },
    canPerformBulkVetting() {
      let numUnknownItemsChecked = 0;
      this.summaryData.children.forEach(polarityGroup => {
        numUnknownItemsChecked += polarityGroup.children.filter(d => {
          return d.meta.checked === true && d.meta.polarity === this.STATEMENT_POLARITY.UNKNOWN;
        }).length;
      });
      return (this.numSelectedItems > 0 && numUnknownItemsChecked === 0);
    },
    reducedStatements() {
      const result = this.statements.reduce((accumulator, s) => {
        const p = s.wm.statement_polarity;
        accumulator.belief_score += s.belief;
        accumulator.same += p === STATEMENT_POLARITY.SAME ? 1 : 0;
        accumulator.opposite += p === STATEMENT_POLARITY.OPPOSITE ? 1 : 0;
        accumulator.unknown += p === STATEMENT_POLARITY.UNKNOWN ? 1 : 0;
        return accumulator;
      }, { same: 0, opposite: 0, unknown: 0, belief_score: 0 });
      result.belief_score = result.belief_score / this.statements.length;
      return result;
    },
    evidenceCount() {
      return _.sumBy(this.statements, d => d.wm.num_evidence);
    },
    polarity() {
      return this.selectedRelationship.polarity;
    },
    polarityColor() {
      return statementPolarityColor(this.polarity);
    }
  },
  watch: {
    statements(n, o) {
      if (_.isEqual(n, o)) return;
      this.refresh();
    }
  },
  created() {
    this.CORRECTION_TYPES = CORRECTION_TYPES;
    this.STATEMENT_POLARITY = STATEMENT_POLARITY;
  },
  mounted() {
    this.refresh();
  },
  methods: {
    saveCustomConcept(value) {
      // TODO : this is temporary, should be connected to storage function in future ticket
      console.log(`Emitted custom grounding: ${JSON.stringify(value)}`);
    },
    statementPolarityFormatter,
    numberFormatter,
    initializeData() {
      this.activeCorrection = null;
      this.expandAll = null;
    },
    refresh() {
      this.initializeData();
      this.summaryData = {
        children: groupByPolarityAllFactors(this.statements),
        meta: { checked: false, isSomeChildChecked: false }
      };
    },
    shouldShowStatementGroup(polarity) {
      // this.selectedRelationship.polarity === undefined in knowledge space
      // this.selectedRelationship.polarity === 0 when it's an ambigious edge (show all statement groups)
      return +polarity === this.selectedRelationship.polarity || this.selectedRelationship.polarity === undefined || this.selectedRelationship.polarity === 0;
    },
    override(value) {
      if (this.expandAll !== null) return this.expandAll;
      else return { value: this.shouldShowStatementGroup(value.key) };
    },
    unusedStatementsStyle(value) {
      return (this.shouldShowStatementGroup(value.key) === false) ? { opacity: 0.4 } : null;
    },
    unusedStatementsNotice(value) {
      if (this.shouldShowStatementGroup(value.key)) return '';
      else return '(' + value.count + ' statement' + (value.count !== 1 ? 's' : '') + ', not used in modeling)';
    },
    openDocumentModal(documentMeta) {
      this.documentModalData = documentMeta;
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
          const numChecked = item.children.filter(d => d.meta.checked || d.meta.isSomeChildChecked).length;
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
    async openEditor(item, type) {
      if (item === this.activeItem && type === this.activeCorrection) {
        this.activeItem = null;
        this.activeCorrection = null;
        return;
      }
      if (type === CORRECTION_TYPES.ONTOLOGY_SUBJ || type === CORRECTION_TYPES.ONTOLOGY_OBJ) {
        this.suggestions = await this.getSuggestions(item, type);
      }

      this.activeItem = item;
      this.activeCorrection = type;
    },
    closeEditor() {
      this.activeItem = null;
      this.activeCorrection = null;
    },
    async getSuggestions(item, correctionType) {
      const ids = item.dataArray.map(d => d.id);
      const suggestions = await getStatementConceptSuggestions(this.project, ids, correctionType);
      return suggestions;
    },
    checkResult(result, successMsg, errorMsg) {
      if (result.status === 200) {
        this.toaster(successMsg, 'success', false);
      } else {
        this.toaster(errorMsg, 'error', true);
      }
    },
    confirmUpdatePolarity(item, newPolarity) {
      if (!this.shouldConfirmCurations) {
        this.updatePolarity(item, newPolarity);
        return;
      }
      this.openConfirmCurationModal(() => { this.updatePolarity(item, newPolarity); });
    },
    async updatePolarity(item, newPolarity) {
      const subj = {
        oldValue: item.meta.subj_polarity,
        newValue: newPolarity.subjPolarity
      };
      const obj = {
        oldValue: item.meta.obj_polarity,
        newValue: newPolarity.objPolarity
      };
      const statementIds = item.dataArray.map(statement => statement.id);
      const result = await updateStatementsPolarity(this.project, statementIds, subj, obj);
      this.checkResult(result, CORRECTIONS.SUCCESSFUL_CORRECTION, CORRECTIONS.ERRONEOUS_CORRECTION);
    },
    confirmDiscardStatements(item) {
      if (!this.shouldConfirmCurations) {
        this.discardStatements(item);
        return;
      }
      this.openConfirmCurationModal(() => { this.discardStatements(item); });
    },
    async discardStatements(item) {
      let statementIds = [];
      let selectedItems = [];
      if (!_.isNil(item)) {
        selectedItems = [item];
      } else {
        this.summaryData.children.forEach(polarityGroup => {
          if (!_.isEmpty(polarityGroup.children)) {
            polarityGroup.children.forEach(item => {
              if (item.meta.checked) {
                selectedItems.push(item);
              }
            });
          }
        });
      }
      selectedItems.forEach(item => {
        statementIds = statementIds.concat(item.dataArray.map(statement => statement.id));
      });
      statementIds = _.uniq(statementIds);

      const updateResult = await discardStatements(this.project, statementIds);
      this.checkResult(updateResult, CORRECTIONS.SUCCESSFUL_CORRECTION, CORRECTIONS.ERRONEOUS_CORRECTION);
    },
    confirmUpdateUnknownBulk(bulkType) {
      if (!this.shouldConfirmCurations) {
        this.updateUnknownBulk(bulkType);
        return;
      }
      this.openConfirmCurationModal(() => { this.updateUnknownBulk(bulkType); });
    },
    async updateUnknownBulk(bulkType) {
      const statementIds = this.statements.filter(s => s.wm.statement_polarity === 0).map(s => s.id);
      let subj = {};
      let obj = {};

      if (bulkType === 'ALL') {
        subj = { oldValue: 0, newValue: 1 };
        obj = { oldValue: 0, newValue: 1 };
      } else {
        subj = { oldValue: 0, newValue: 1 };
      }
      const result = await updateStatementsPolarity(this.project, statementIds, subj, obj);
      this.checkResult(result, CORRECTIONS.SUCCESSFUL_CORRECTION, CORRECTIONS.ERRONEOUS_CORRECTION);
    },
    confirmUpdateGrounding(item, curGrounding, newGrounding, resourceType) {
      if (!this.shouldConfirmCurations) {
        this.updateGrounding(item, curGrounding, newGrounding, resourceType);
        return;
      }
      this.openConfirmCurationModal(() => { this.updateGrounding(item, curGrounding, newGrounding, resourceType); });
    },
    async updateGrounding(item, curGrounding, newGrounding, resourceType) {
      let subj = {};
      let obj = {};
      if (resourceType === CORRECTION_TYPES.ONTOLOGY_SUBJ) {
        subj = {
          oldValue: curGrounding,
          newValue: newGrounding
        };
      } else if (resourceType === CORRECTION_TYPES.ONTOLOGY_OBJ) {
        obj = {
          oldValue: curGrounding,
          newValue: newGrounding
        };
      }
      const statementIds = item.dataArray.map(statement => statement.id);
      const result = await updateStatementsFactorGrounding(this.project, statementIds, subj, obj);
      this.checkResult(result, CORRECTIONS.SUCCESSFUL_CORRECTION, CORRECTIONS.ERRONEOUS_CORRECTION);
    },
    confirmVet(item) {
      if (!this.shouldConfirmCurations) {
        this.vet(item);
        return;
      }
      this.openConfirmCurationModal(() => { this.vet(item); });
    },
    async vet(item) {
      let statementIds = [];
      if (!_.isEmpty(item)) {
        statementIds = item.dataArray.map(statement => statement.id);
      } else {
        this.summaryData.children.forEach(group => {
          if (group.key !== 0) {
            group.children.forEach(child => {
              if (child.meta.checked) {
                statementIds = statementIds.concat(child.dataArray.map(s => s.id));
              }
            });
          }
        });
      }

      const result = await vetStatements(this.project, statementIds);
      this.checkResult(result, CURATIONS.SUCCESSFUL_CURATION, CURATIONS.ERRONEOUS_CURATION);
    },
    confirmReverseRelation(item) {
      if (!this.shouldConfirmCurations) {
        this.reverseRelation(item);
        return;
      }
      this.openConfirmCurationModal(() => { this.reverseRelation(item); });
    },
    async reverseRelation(item) {
      const statementIds = item.dataArray.map(statement => statement.id);
      const result = await reverseStatementsRelation(this.project, statementIds);
      this.checkResult(result, CURATIONS.SUCCESSFUL_CURATION, CURATIONS.ERRONEOUS_CURATION);
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

.evidence-container {
  .vetted-dark {
    cursor: pointer;
    display: inline;
    padding: 5px;
    color: $vetted-state-dark;
  }
  .unknown-bulk-icons {
    display: inline-block;
    position: relative;
    margin-left: 5px;
  }
  .polarities-grouping-container {
    .polarities-grouping-title {
      display: flex;
      .grouping-title {
        padding: 4px 0;
        font-weight: bold;
      }
    }
    .statement-polarity-arrow {
      padding-left: 5px;
      padding-right: 8px;
    }
  }
}
</style>
