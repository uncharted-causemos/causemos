<template>
  <div class="factors-recommendations-container">
    <modal-document
      v-if="!!documentModalData"
      :document-data="documentModalData"
      @close="documentModalData = null"
    />
    <message-display
      :message="`Because you corrected ${correction.factor} to ${shortConceptName}, you may need to do it for these too ...`"
      :message-type="`warning`"
      :highlights="[correction.factor, shortConceptName]" />
    <div class="pane-controls">
      <div class=" bulk-actions">
        <i
          class="fa fa-lg fa-fw"
          :class="{
            'fa-check-square-o': summaryData.meta.checked,
            'fa-square-o': !summaryData.meta.checked && !summaryData.isSomeChildChecked,
            'fa-minus-square-o': !summaryData.meta.checked && summaryData.meta.isSomeChildChecked
          }"
          @click="toggle(summaryData)"
        />
        <button
          v-tooltip.top-center="'Fix factors in bulk'"
          type="button"
          class="btn btn-sm btn-primary btn-call-for-action"
          @click="updateGrounding"
        >
          Fix it
        </button>
        <button
          type="button"
          class="btn btn-sm btn-link"
          @click="closePane()"
        >
          No thanks
        </button>
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
    <hr class="pane-separator">
    <div class="factors-recommendation-content">
      <div
        v-for="value in summaryData.children"
        :key="value.key"
      >

        <evidence-group
          :expand-all="expandAll"
          :item="value"
          :show-curation-actions="false"
          @click-evidence="openDocumentModal"
          @toggle="toggle"
        />
      </div>
    </div>
    <div
      v-if="isFetchingStatements"
      class="pane-loading-message"
    >
      <i class="fa fa-spin fa-spinner pane-loading-icon" /><span>{{ loadingMessage }}</span>
    </div>
  </div>
</template>

<script>
import _ from 'lodash';
import { mapGetters } from 'vuex';

import { updateStatementsFactorGrounding } from '@/services/curation-service';
import ModalDocument from '@/components/modals/modal-document';
import MessageDisplay from '@/components/widgets/message-display';
import SmallTextButton from '@/components/widgets/small-text-button';
import EvidenceGroup from '@/components/drilldown-panel/evidence-group';
import aggregationsUtil from '@/utils/aggregations-util';
import messagesUtil from '@/utils/messages-util';
import { conceptHumanName } from '@/utils/concept-util';

const CORRECTIONS = messagesUtil.CORRECTIONS;

export default {
  name: 'FactorsRecommendationsPane',
  components: {
    ModalDocument,
    MessageDisplay,
    EvidenceGroup,
    SmallTextButton
  },
  props: {
    correction: {
      type: Object,
      default: () => null
    },
    recommendations: {
      type: Array,
      default: () => []
    },
    isFetchingStatements: {
      type: Boolean,
      default: false
    }
  },
  data: () => ({
    loadingMessage: 'Loading factor recommendations...',
    documentModalData: null,
    expandAll: null,
    summaryData: { children: [], meta: { checked: false } }
  }),
  computed: {
    ...mapGetters({
      currentCAG: 'app/currentCAG',
      project: 'app/project',
      ontologySet: 'app/ontologySet'
    }),
    numSelectedItems() {
      let cnt = 0;
      this.summaryData.children.forEach(polarityGroup => {
        cnt += polarityGroup.children.filter(d => d.meta.checked === true).length;
      });
      return cnt;
    },
    shortConceptName() {
      return conceptHumanName(this.correction.newGrounding, this.ontologySet);
    }
  },
  watch: {
    recommendations(n, o) {
      if (_.isEqual(n, o)) return;
      this.refresh();
    }
  },
  mounted() {
    this.refresh();
  },
  methods: {
    initializeData() {
      this.expandAll = null;
    },
    refresh() {
      if (_.isEmpty(this.recommendations)) return;
      const statements = _.flatten(this.recommendations.map(r => r.statements));
      this.initializeData();
      this.summaryData = {
        children: this.groupStatements(statements),
        meta: { checked: false, isSomeChildChecked: false }
      };
    },
    groupStatements(statements) {
      const evidenceGroups = aggregationsUtil.groupDataArray(statements, [
        // Group by subj and obj
        {
          keyFn: (s) => s.subj.factor + s.subj.polarity + '///' + s.obj.factor + s.obj.polarity,
          sortFn: (s) => {
            // Sort by total number of evidence
            return -s.meta.num_evidence;
          },
          metaFn: (s) => {
            const sample = s.dataArray[0];
            const meta = {};
            meta.checked = false;

            meta.polarity = sample.statement_polarity;
            meta.subj_polarity = sample.subj.polarity;
            meta.subj_factor_highlight = this.recommendations.map(r => r.highlights).includes(sample.subj.factor);
            meta.subj = sample.subj;
            meta.obj_polarity = sample.obj.polarity;
            meta.obj_factor_highlight = this.recommendations.map(r => r.highlights).includes(sample.obj.factor);
            meta.obj = sample.obj;

            meta.num_evidence = _.sumBy(s.dataArray, d => {
              return d.evidence.length;
            });
            return meta;
          }
        }
      ]);
      return evidenceGroups;
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
    openDocumentModal(documentMeta) {
      this.documentModalData = documentMeta;
    },
    closePane() {
      this.$emit('close-overlay');
    },
    async updateGrounding() {
      const correction = this.correction;
      const subj = {
        oldValue: correction.curGrounding,
        newValue: correction.newGrounding
      };
      const obj = {
        oldValue: correction.curGrounding,
        newValue: correction.newGrounding
      };
      let statementIds = [];
      const selectedItems = this.summaryData.children.filter(d => d.meta.checked === true);
      selectedItems.forEach(d => {
        statementIds = statementIds.concat(d.dataArray.map(statement => statement.id));
      });

      const updateResult = await updateStatementsFactorGrounding(this.project, statementIds, subj, obj);
      if (updateResult.status === 200) {
        this.toaster(CORRECTIONS.SUCCESSFUL_CORRECTION, 'success', false);
      } else {
        this.toaster(CORRECTIONS.ERRONEOUS_CORRECTION, 'error', true);
      }
      this.closePane();
    }
  }
};
</script>

<style lang="scss" scoped>
@import '~styles/variables';

//FIXME: Temporary hack. We should eventually use flexbox to take the full available height.
.factors-recommendation-content {
  height: 90vh;
  overflow-y: auto;
}


</style>
