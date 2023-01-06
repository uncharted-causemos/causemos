<template>
  <div class="evidence-container">
    <modal-document
      v-if="!!documentModalData"
      :document-id="documentModalData.doc_id"
      :text-fragment="textFragment"
      @close="documentModalData = null"
    />
    <div class="pane-summary">
      {{ ontologyFormatter(selectedRelationship.source) }}
      <i class="fa fa-long-arrow-right fa-lg icon" :style="polarityColor" /> &nbsp;{{
        ontologyFormatter(selectedRelationship.target)
      }}
    </div>
    <slot />
    <div class="pane-summary">
      Evidence ({{ numberFormatter(evidenceCount) }}), Documents ({{ documentCount }})
    </div>
    <div v-if="mapData.features.length > 0">
      <div style="height: 180px">
        <map-points :map-data="mapData" :map-bounds="mapBounds" :formatterFn="mapFormatter" />
      </div>
    </div>
    <collapsible-list-header
      v-if="summaryData.children.length"
      @expand-all="expandAll = { value: true }"
      @collapse-all="expandAll = { value: false }"
    >
      <template v-if="showCurationActions && summaryData.children.length">
        <i
          class="fa fa-lg fa-fw"
          :class="{
            'fa-check-square-o': summaryData.meta.checked,
            'fa-square-o': !summaryData.meta.checked && !summaryData.meta.isSomeChildChecked,
            'fa-minus-square-o': !summaryData.meta.checked && summaryData.meta.isSomeChildChecked,
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
      <div v-for="value in summaryData.children" :key="value.key">
        <!-- FIXME: the below v-if was an out of place fix for this UI displaying old data, should be fixed somewhere else -->
        <collapsible-item
          v-if="!isFetchingStatements"
          :default-expand="true"
          :override="override(value)"
          :style="unusedStatementsStyle(value)"
          class="polarities-grouping-container"
        >
          <template v-if="showCurationActions" #controls>
            <i
              class="fa fa-lg fa-fw"
              :class="{
                'fa-check-square-o': value.meta.checked,
                'fa-square-o': !value.meta.checked && !value.isSomeChildChecked,
                'fa-minus-square-o': !value.meta.checked && value.meta.isSomeChildChecked,
              }"
              @click="toggle(value)"
            />
          </template>
          <template #title class="polarities-grouping-title">
            <div class="grouping-title">
              {{ statementPolarityFormatter(value.key) }} {{ unusedStatementsNotice(value) }}
            </div>
            <div
              v-if="+value.key === STATEMENT_POLARITY.UNKNOWN && showCurationActions"
              class="unknown-bulk-icons"
            >
              <i class="fa fa-question" />
              <i
                class="fa fa-caret-down"
                @click.stop="openEditor(null, CORRECTION_TYPES.POLARITY_UNKNOWN)"
              />
              <unknown-polarity-editor
                v-if="activeCorrection === CORRECTION_TYPES.POLARITY_UNKNOWN"
                @select="updateUnknownBulk($event)"
                @close="activeCorrection = null"
              />
            </div>
          </template>
          <template #content>
            <div v-for="item of value.children" :key="item.key" class="evidence-polarities">
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
                @open-editor="openEditor($event.item, $event.type)"
              />

              <polarity-editor
                v-if="activeItem === item && activeCorrection === CORRECTION_TYPES.POLARITY"
                :item="{
                  subj_polarity: item.meta.subj_polarity,
                  obj_polarity: item.meta.obj_polarity,
                }"
                @reverse-relation="confirmReverseRelation(item)"
                @select="confirmUpdatePolarity(item, $event)"
                @close="closeEditor"
              />
              <ontology-editor
                v-if="activeItem === item && activeCorrection === CORRECTION_TYPES.ONTOLOGY_SUBJ"
                :concept="selectedRelationship.source"
                :suggestions="suggestions"
                @select="
                  confirmUpdateGrounding(
                    item,
                    selectedRelationship.source,
                    $event,
                    CORRECTION_TYPES.ONTOLOGY_SUBJ
                  )
                "
                @close="closeEditor"
              />

              <ontology-editor
                v-if="activeItem === item && activeCorrection === CORRECTION_TYPES.ONTOLOGY_OBJ"
                :concept="selectedRelationship.target"
                :suggestions="suggestions"
                @select="
                  confirmUpdateGrounding(
                    item,
                    selectedRelationship.target,
                    $event,
                    CORRECTION_TYPES.ONTOLOGY_OBJ
                  )
                "
                @close="closeEditor"
              />
            </div>
          </template>
        </collapsible-item>
      </div>
    </div>
    <div v-else>
      <message-display :message="messageNoData" />
    </div>
    <div
      v-if="showEdgeRecommendations && (recommendations?.length ?? 0) > 0"
      style="margin-top: 10px"
    >
      <div class="pane-summary">
        Recommendations
        <button class="btn btn-sm" @click="addRecommendations">Add</button>
      </div>
      <collapsible-item
        v-for="(recommendation, statIdx) in recommendations"
        :override="{ value: false }"
        :key="statIdx"
        class="statements-container"
      >
        <template #controls>
          <i
            class="fa fa-lg fa-fw"
            :class="{
              'fa-check-square-o': recommendations[statIdx].isSelected,
              'fa-square-o': !recommendations[statIdx].isSelected,
            }"
            @click="toggleRecommendation(statIdx)"
          />
        </template>
        <template #title>
          <div class="curration-recommendation-item-title">
            {{ recommendation.statement.subj.factor }}
            <i
              class="fa fa-long-arrow-right fa-lg"
              :class="recommendation.statement.wm.statement_polarity === 1 ? 'blue' : 'red'"
            />
            {{ recommendation.statement.obj.factor }}
          </div>
        </template>

        <template #content>
          <div
            v-for="(evidence, idx) in recommendation.statement.evidence"
            :key="idx"
            class="evidence"
          >
            {{ evidence.evidence_context.text }}
          </div>
        </template>
      </collapsible-item>
    </div>
    <div v-if="isFetchingStatements" class="pane-loading-message">
      <i class="fa fa-spin fa-spinner pane-loading-icon" /><span>{{ loadingMessage }}</span>
    </div>
    <modal-confirmation
      v-if="showConfirmCurationModal"
      :autofocus-confirm="false"
      @confirm="curationConfirmedCallback"
      @close="closeConfirmCurationModal"
    >
      <template #title>Confirm Curation Action</template>
      <template #message>
        <p>This action will affect the entire Knowledge Base and other CAGs that use it.</p>
        <p>Do you want to proceed?</p>
      </template>
    </modal-confirmation>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { defineComponent, ref, PropType, Ref } from 'vue';

import {
  CORRECTION_TYPES,
  getStatementConceptSuggestions,
  groupByPolarityAllFactors,
  discardStatements,
  vetStatements,
  reverseStatementsRelation,
  updateStatementsFactorGrounding,
  updateStatementsPolarity,
  getEvidenceRecommendations,
} from '@/services/curation-service';

import MapPoints from '@/components/kb-explorer/map-points.vue';
import OntologyEditor from '@/components/editors/ontology-editor.vue';
import PolarityEditor from '@/components/editors/polarity-editor.vue';
import UnknownPolarityEditor from '@/components/editors/unknown-polarity-editor.vue';
import CollapsibleListHeader from '@/components/drilldown-panel/collapsible-list-header.vue';
import CollapsibleItem from '@/components/drilldown-panel/collapsible-item.vue';
import EvidenceGroup from '@/components/drilldown-panel/evidence-group.vue';
import ModalDocument from '@/components/modals/modal-document.vue';
import SmallIconButton from '@/components/widgets/small-icon-button.vue';
import MessageDisplay from '@/components/widgets/message-display.vue';
import ModalConfirmation from '@/components/modals/modal-confirmation.vue';
import { CORRECTIONS, CURATIONS, SIDE_PANEL } from '@/utils/messages-util';
import statementPolarityFormatter from '@/formatters/statement-polarity-formatter';
import numberFormatter from '@/formatters/number-formatter';
import useToaster from '@/services/composables/useToaster';
import { TYPE } from 'vue-toastification';

import { STATEMENT_POLARITY, statementPolarityColor } from '@/utils/polarity-util';
import geo from '@/utils/geo-util';
import { Statement, Evidence, DocumentContext } from '@/types/Statement';
import { AggChild } from '@/utils/aggregations-util';

type SummaryData = {
  children: AggChild<Statement>[];
  meta: any;
};

export default defineComponent({
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
    MapPoints,
  },
  props: {
    selectedRelationship: {
      type: Object,
      default: null,
      validator(selectedRelationship: any) {
        return (
          selectedRelationship !== undefined &&
          selectedRelationship.source !== undefined &&
          selectedRelationship.target !== undefined
        );
      },
    },
    statements: {
      type: Array as PropType<Statement[]>,
      default: () => [],
    },
    project: {
      type: String,
      default: null,
    },
    showCurationActions: {
      type: Boolean,
      default: true,
    },
    isFetchingStatements: {
      type: Boolean,
      default: false,
    },
    shouldConfirmCurations: {
      type: Boolean,
      default: false,
    },
    showEdgeRecommendations: {
      type: Boolean,
      default: false,
    },
  },
  setup() {
    // Evidence recommendations
    const recommendations = ref([]) as Ref<any[]>;

    const summaryData = ref({ children: [], meta: { checked: false } }) as Ref<SummaryData>;
    const suggestions = ref([]) as Ref<{ name: string; score: number }[]>;
    const textFragment = ref('');
    const activeItem = ref(null) as Ref<AggChild<Statement> | null>;
    const documentModalData = ref(null) as Ref<DocumentContext | null>;
    const activeCorrection = ref(null) as Ref<CORRECTION_TYPES | null>;

    return {
      recommendations,
      summaryData,
      suggestions,
      textFragment,
      activeItem,
      documentModalData,
      activeCorrection,

      CORRECTION_TYPES,
      STATEMENT_POLARITY,
      messageNoData: SIDE_PANEL.EVIDENCE_NO_DATA,

      toaster: useToaster(),

      mapFormatter: () => '',
    };
  },
  data: () => ({
    // States
    expandAll: null,
    loadingMessage: 'Loading evidence...',
    showConfirmCurationModal: false,
    curationConfirmedCallback: () => null as any, // FIXME
  }),
  computed: {
    numSelectedItems() {
      let cnt = 0;
      this.summaryData.children.forEach((polarityGroup) => {
        if (polarityGroup.children) {
          cnt += polarityGroup.children.filter(
            (d: AggChild<Statement>) => d.meta.checked === true
          ).length;
        }
      });
      return cnt;
    },
    canPerformBulkVetting() {
      let numUnknownItemsChecked = 0;
      this.summaryData.children.forEach((polarityGroup) => {
        if (polarityGroup.children) {
          numUnknownItemsChecked += polarityGroup.children.filter((d: AggChild<Statement>) => {
            return d.meta.checked === true && d.meta.polarity === this.STATEMENT_POLARITY.UNKNOWN;
          }).length;
        }
      });
      return this.numSelectedItems > 0 && numUnknownItemsChecked === 0;
    },
    evidenceCount() {
      return _.sumBy(this.statements, (d) => d.wm.num_evidence);
    },
    documentCount() {
      const docs: string[] = [];
      if (this.summaryData.children.length === 0) return 0;

      this.summaryData.children.forEach((polarityGroup) => {
        if (!polarityGroup.children) return;
        polarityGroup.children.forEach((factorGroup) => {
          factorGroup.dataArray.forEach((stmt) => {
            stmt.evidence.forEach((evidence) => {
              docs.push(evidence.document_context.doc_id);
            });
          });
        });
      });
      return _.uniq(docs).length;
    },
    mapData() {
      const result: { type: string; features: any[] } = {
        type: 'FeatureCollection',
        features: [],
      };
      if (this.summaryData.children.length === 0) return result;

      // Collect events counts
      const tracker: Map<string, number> = new Map();
      this.summaryData.children.forEach((polarityGroup) => {
        if (!polarityGroup.children) return;
        polarityGroup.children.forEach((factorGroup) => {
          factorGroup.dataArray.forEach((stmt) => {
            const subjGeo = stmt.subj.geo_context;
            const objGeo = stmt.obj.geo_context;

            if (!_.isEmpty(subjGeo)) {
              const key = subjGeo?.name + ':' + subjGeo?.location.lat + ':' + subjGeo?.location.lon;
              const n = tracker.get(key) || 0;
              tracker.set(key, n + 1);
            }
            if (!_.isEmpty(objGeo)) {
              const key = objGeo?.name + ':' + objGeo?.location.lat + ':' + objGeo?.location.lon;
              const n = tracker.get(key) || 0;
              tracker.set(key, n + 1);
            }
          });
        });
      });

      // Make geojson
      const baseSize = 10;
      const max = Math.max(...tracker.values());
      const min = Math.min(...tracker.values());

      const sizeFn = (count: number, min: number, max: number) => {
        if (max === min) return baseSize;
        const size = Math.sqrt((count / (max - min)) * baseSize);
        return Math.max(size, 3); // keep the smallest radius to 3
      };

      for (const key of tracker.keys()) {
        const [name, lat, lon] = key.split(':');
        const count = tracker.get(key) || 1;
        const size = sizeFn(count, max, min);

        result.features.push({
          type: 'Feature',
          properties: {
            name: name,
            count: count,
            radius: size,
            color: '#f80',
          },
          geometry: {
            type: 'Point',
            coordinates: [+lon, +lat],
          },
        });
      }
      return result;
    },
    mapBounds() {
      const coords: [number, number][] = this.mapData.features.map(
        (feat) => feat.geometry.coordinates
      );
      return geo.expand(geo.bbox(coords));
    },
    polarity() {
      return this.selectedRelationship.polarity;
    },
    polarityColor() {
      return statementPolarityColor(this.polarity);
    },
  },
  emits: ['updated-relations', 'add-edge-evidence-recommendations'],
  watch: {
    statements(n, o) {
      if (_.isEqual(n, o)) return;
      this.refresh();
    },
  },
  mounted() {
    this.refresh();
  },
  methods: {
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
        meta: { checked: false, isSomeChildChecked: false },
      };

      if (_.isEmpty(this.statements) && this.showEdgeRecommendations === true) {
        this.getRecommendations().then((r) => {
          r.recommendations.forEach((s: any) => {
            s.isSelected = false;
          });
          this.recommendations = r.recommendations;
        });
      }
    },
    shouldShowStatementGroup(polarity: any) {
      // this.selectedRelationship.polarity === undefined in knowledge space
      // this.selectedRelationship.polarity === 0 when it's an ambigious edge (show all statement groups)
      return (
        +polarity === this.selectedRelationship.polarity ||
        this.selectedRelationship.polarity === undefined ||
        this.selectedRelationship.polarity === 0
      );
    },
    override(value: AggChild<Statement>) {
      if (this.expandAll !== null) return this.expandAll;
      else return { value: this.shouldShowStatementGroup(value.key) };
    },
    unusedStatementsStyle(value: AggChild<Statement>) {
      return this.shouldShowStatementGroup(value.key) === false ? { opacity: 0.4 } : null;
    },
    unusedStatementsNotice(value: AggChild<Statement>) {
      if (this.shouldShowStatementGroup(value.key)) return '';
      else
        return (
          '(' +
          value.count +
          ' statement' +
          (value.count !== 1 ? 's' : '') +
          ', not used in analysis)'
        );
    },
    openDocumentModal(evidence: Evidence) {
      this.documentModalData = evidence.document_context;
      this.textFragment = evidence.evidence_context.text;
    },
    toggle(item: AggChild<Statement>) {
      // Recursive helpers
      const recursiveDown = (item: AggChild<Statement>, newState: any) => {
        item.meta.checked = newState;
        if (!item.children) return;
        item.children.forEach((child) => recursiveDown(child, newState));
      };

      const recursiveUp = (item: AggChild<Statement>) => {
        if (item.children && !_.isEmpty(item.children)) {
          item.children.forEach((child) => recursiveUp(child));
          const numChecked = item.children.filter(
            (d) => d.meta.checked || d.meta.isSomeChildChecked
          ).length;
          item.meta.checked = numChecked === item.children.length;
          item.meta.isSomeChildChecked = numChecked > 0;
        }
      };

      // Toggle on if not currently checked and no children are partially or fully checked
      //  otherwise toggle off
      item.meta.checked = !item.meta.isSomeChildChecked && !item.meta.checked;

      // Traverse down to change children, then traverse up to update parents
      recursiveDown(item, item.meta.checked);
      recursiveUp(this.summaryData as AggChild<Statement>);
    },
    async openEditor(item: AggChild<Statement>, type: CORRECTION_TYPES) {
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
    async getSuggestions(item: AggChild<Statement>, correctionType: CORRECTION_TYPES) {
      const ids = item.dataArray.map((d) => d.id);
      const suggestions = await getStatementConceptSuggestions(this.project, ids, correctionType);
      return suggestions;
    },
    checkResult(result: any, successMsg: string, errorMsg: string) {
      if (result.status === 200) {
        this.toaster(successMsg, TYPE.SUCCESS, false);
      } else {
        this.toaster(errorMsg, TYPE.INFO, true);
      }
    },
    confirmUpdatePolarity(item: AggChild<Statement>, newPolarity: any) {
      if (!this.shouldConfirmCurations) {
        this.updatePolarity(item, newPolarity);
        return;
      }
      this.openConfirmCurationModal(() => {
        this.updatePolarity(item, newPolarity);
      });
    },
    async updatePolarity(item: AggChild<Statement>, newPolarity: any) {
      const subj = {
        oldValue: item.meta.subj_polarity,
        newValue: newPolarity.subjPolarity,
      };
      const obj = {
        oldValue: item.meta.obj_polarity,
        newValue: newPolarity.objPolarity,
      };
      const statementIds = item.dataArray.map((statement) => statement.id);
      const result = await updateStatementsPolarity(this.project, statementIds, subj, obj);
      this.checkResult(result, CORRECTIONS.SUCCESSFUL_CORRECTION, CORRECTIONS.ERRONEOUS_CORRECTION);
    },
    confirmDiscardStatements(item: AggChild<Statement>) {
      if (!this.shouldConfirmCurations) {
        this.discardStatements(item);
        return;
      }
      this.openConfirmCurationModal(() => {
        this.discardStatements(item);
      });
    },
    async discardStatements(item: AggChild<Statement>) {
      let statementIds: string[] = [];
      let selectedItems: AggChild<Statement>[] = [];
      if (!_.isNil(item)) {
        selectedItems = [item];
      } else {
        this.summaryData.children.forEach((polarityGroup: AggChild<Statement>) => {
          if (polarityGroup.children && !_.isEmpty(polarityGroup.children)) {
            polarityGroup.children.forEach((item: AggChild<Statement>) => {
              if (item.meta.checked) {
                selectedItems.push(item);
              }
            });
          }
        });
      }
      selectedItems.forEach((item) => {
        statementIds = statementIds.concat(item.dataArray.map((statement) => statement.id));
      });
      statementIds = _.uniq(statementIds);

      const updateResult = await discardStatements(this.project, statementIds);
      this.checkResult(
        updateResult,
        CORRECTIONS.SUCCESSFUL_CORRECTION,
        CORRECTIONS.ERRONEOUS_CORRECTION
      );
    },
    /* Not currently used Feb 2022
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
    */
    confirmUpdateGrounding(
      item: AggChild<Statement>,
      curGrounding: string,
      newGrounding: string,
      resourceType: number
    ) {
      if (!this.shouldConfirmCurations) {
        this.updateGrounding(item, curGrounding, newGrounding, resourceType);
        return;
      }
      this.openConfirmCurationModal(() => {
        this.updateGrounding(item, curGrounding, newGrounding, resourceType);
      });
    },
    async updateGrounding(
      item: AggChild<Statement>,
      curGrounding: string,
      newGrounding: string,
      resourceType: number
    ) {
      let subj = {};
      let obj = {};
      if (resourceType === CORRECTION_TYPES.ONTOLOGY_SUBJ) {
        subj = {
          oldValue: curGrounding,
          newValue: newGrounding,
        };
      } else if (resourceType === CORRECTION_TYPES.ONTOLOGY_OBJ) {
        obj = {
          oldValue: curGrounding,
          newValue: newGrounding,
        };
      }
      const statementIds = item.dataArray.map((statement) => statement.id);
      const result = await updateStatementsFactorGrounding(this.project, statementIds, subj, obj);

      // Emit the updated relations - use in CAG space to retain newly grounded data
      const relation: any = { id: '' };
      if (resourceType === CORRECTION_TYPES.ONTOLOGY_SUBJ) {
        relation.source = newGrounding;
        relation.target = item.dataArray[0].obj.concept;
      } else {
        relation.source = item.dataArray[0].subj.concept;
        relation.target = newGrounding;
      }
      relation.reference_ids = statementIds;
      this.$emit('updated-relations', [relation]);

      this.checkResult(result, CORRECTIONS.SUCCESSFUL_CORRECTION, CORRECTIONS.ERRONEOUS_CORRECTION);
    },
    confirmVet(item: AggChild<Statement>) {
      if (!this.shouldConfirmCurations) {
        this.vet(item);
        return;
      }
      this.openConfirmCurationModal(() => {
        this.vet(item);
      });
    },
    async vet(item: AggChild<Statement>) {
      let statementIds: string[] = [];
      if (!_.isEmpty(item)) {
        statementIds = item.dataArray.map((statement) => statement.id);
      } else {
        this.summaryData.children.forEach((group) => {
          if ((group.key as any) !== 0 && group.children) {
            group.children.forEach((child) => {
              if (child.meta.checked) {
                statementIds = statementIds.concat(child.dataArray.map((s) => s.id));
              }
            });
          }
        });
      }

      const result = await vetStatements(this.project, statementIds);
      this.checkResult(result, CURATIONS.SUCCESSFUL_CURATION, CURATIONS.ERRONEOUS_CURATION);
    },
    confirmReverseRelation(item: AggChild<Statement>) {
      if (!this.shouldConfirmCurations) {
        this.reverseRelation(item);
        return;
      }
      this.openConfirmCurationModal(() => {
        this.reverseRelation(item);
      });
    },
    async reverseRelation(item: AggChild<Statement>) {
      const statementIds = item.dataArray.map((statement) => statement.id);
      const result = await reverseStatementsRelation(this.project, statementIds);
      this.checkResult(result, CURATIONS.SUCCESSFUL_CURATION, CURATIONS.ERRONEOUS_CURATION);
    },
    openConfirmCurationModal(confirmedCallback: any) {
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
    async getRecommendations() {
      const source = this.selectedRelationship.source;
      const target = this.selectedRelationship.target;
      const statements = await getEvidenceRecommendations(this.project, source, target);
      return statements;
    },
    toggleRecommendation(idx: number) {
      if (this.recommendations) {
        this.recommendations[idx].isSelected = !this.recommendations[idx].isSelected;
      }
    },
    addRecommendations() {
      const ids = this.recommendations.filter((d) => d.isSelected).map((d) => d.statement.id);
      this.$emit('add-edge-evidence-recommendations', ids);
    },
  },
});
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
.blue {
  color: $positive;
}

.red {
  color: $negative;
}
</style>
