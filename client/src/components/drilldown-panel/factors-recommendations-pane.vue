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
      <button
        v-tooltip.top-center="'Fix factors in bulk'"
        type="button"
        class="btn btn-sm btn-call-to-action"
        @click="updateGrounding"
      >
        Fix it
      </button>
      <button
        type="button"
        class="btn btn-sm"
        @click="closePane()"
      >
        No thanks
      </button>
    </collapsible-list-header>
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
import { TYPE } from 'vue-toastification';

import { updateStatementsFactorGrounding, trackCurations } from '@/services/curation-service';
import ModalDocument from '@/components/modals/modal-document';
import MessageDisplay from '@/components/widgets/message-display';
import EvidenceGroup from '@/components/drilldown-panel/evidence-group';
import aggregationsUtil from '@/utils/aggregations-util';
import messagesUtil from '@/utils/messages-util';
import CollapsibleListHeader from '@/components/drilldown-panel/collapsible-list-header.vue';

const CORRECTIONS = messagesUtil.CORRECTIONS;

export default {
  name: 'FactorsRecommendationsPane',
  components: {
    ModalDocument,
    MessageDisplay,
    EvidenceGroup,
    CollapsibleListHeader
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
    curationTrackingId: {
      type: String,
      default: ''
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
      project: 'app/project'
    }),
    numSelectedItems() {
      let cnt = 0;
      this.summaryData.children.forEach(polarityGroup => {
        cnt += polarityGroup.children.filter(d => d.meta.checked === true).length;
      });
      return cnt;
    },
    shortConceptName() {
      return this.ontologyFormatter(this.correction.newGrounding);
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
        this.toaster(CORRECTIONS.SUCCESSFUL_CORRECTION, TYPE.SUCCESS, false);
      } else {
        this.toaster(CORRECTIONS.ERRONEOUS_CORRECTION, TYPE.INFO, true);
      }

      if (this.curationTrackingId !== null) {
        const suggestedCurations = this.recommendations.map(r => {
          return {
            statementIds: r.statements.map(s => s.id),
            factor: r.highlights,
            score: r.score
          };
        });
        const payload = {
          suggestedCurations: suggestedCurations,
          acceptedCurations: statementIds
        };
        trackCurations(this.curationTrackingId, payload);
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
