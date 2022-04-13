<template>
  <div class="list-insights-modal-container">
    <full-screen-modal-header
      icon="angle-left"
      nav-back-label="Exit Saved Insights"
      @close="closeInsightPanel"
    >
    </full-screen-modal-header>

    <div class="body flex">
      <div class="checklist">
        <list-analytical-questions-pane
          :show-checklist-title="true"
          :can-click-checklist-items="true"
          @item-click="reviewChecklist"
        >
          <button
            class="btn btn-primary btn-call-for-action review-button"
            :disabled="insightsGroupedByQuestion.length === 0"
            @click="() => reviewChecklist(null, null)"
          >
            <i class="fa fa-fw fa-desktop" />
            Review
          </button>
        </list-analytical-questions-pane>
      </div>
      <!-- body -->
      <div class="body-main-content flex-col">
        <div class="tab-controls">
          <input
            v-model="search"
            v-focus
            type="text"
            class="search form-control"
            placeholder="Search insights"
          >
          <radio-button-group
            class="export-options"
            :buttons="exportOptions"
            :selected-button-value="activeExportOption"
            @button-clicked="toggleExport"
          />
          as
          <button
            class="btn btn-sm btn-default"
            @click="() => exportInsights('Powerpoint')"
          >
            PowerPoint
          </button>
          <button
            class="btn btn-sm btn-default"
            @click="() => exportInsights('Word')"
          >
            Word
          </button>
        </div>
        <div class="cards">
          <div v-if="searchedInsights.length > 0" class="pane-content">
            <insight-card
              v-for="insight in searchedInsights"
              :active-insight="activeInsightId"
              :card-mode="true"
              :curated="isCuratedInsight(insight.id as string)"
              :key="insight.id"
              :insight="insight"
              @remove-insight="removeInsight(insight)"
              @edit-insight="editInsight(insight)"
              @open-editor="openEditor(insight.id as string)"
              @select-insight="reviewInsight(insight)"
              @update-curation="updateCuration(insight.id as string)"
              draggable='true'
              @dragstart="startDrag($event, insight)"
              @dragend="dragEnd($event)"
            />
          </div>
          <message-display
            class="pane-content"
            v-else
            :message="messageNoData"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { mapGetters, mapActions, useStore } from 'vuex';

import { INSIGHTS } from '@/utils/messages-util';

import InsightCard from '@/components/insight-manager/insight-card.vue';
import FullScreenModalHeader from '@/components/widgets/full-screen-modal-header.vue';

import { ref, watch, computed, defineComponent } from 'vue';

import ListAnalyticalQuestionsPane from '@/components/analytical-questions/list-analytical-questions-pane.vue';
import useInsightsData from '@/services/composables/useInsightsData';
import useToaster from '@/services/composables/useToaster';
import MessageDisplay from '@/components/widgets/message-display.vue';
import InsightUtil from '@/utils/insight-util';
import { unpublishDatacube } from '@/utils/datacube-util';
import RadioButtonGroup from '../widgets/radio-button-group.vue';
import { fetchPartialInsights } from '@/services/insight-service';
import { sortQuestionsByPath } from '@/utils/questions-util';
import { AnalyticalQuestion, FullInsight } from '@/types/Insight';

const EXPORT_OPTIONS = {
  insights: 'insights',
  questions: 'questions'
};

const NOT_READY_ERROR = 'Insights are still loading. Try again later.';

export default defineComponent({
  name: 'ListInsightsModal',
  components: {
    FullScreenModalHeader,
    InsightCard,
    MessageDisplay,
    ListAnalyticalQuestionsPane,
    RadioButtonGroup
  },
  data: () => ({
    activeExportOption: EXPORT_OPTIONS.insights,
    activeInsightId: null as string | null,
    curatedInsightIds: [] as string[],
    messageNoData: INSIGHTS.NO_DATA,
    search: ''
  }),
  setup() {
    const store = useStore();
    const toaster = useToaster();
    // prevent insight fetches if the gallery is closed
    const preventFetches = computed(() => !store.getters['insightPanel/isPanelOpen']);
    const { insights, reFetchInsights, fetchImagesForInsights } = useInsightsData(preventFetches);
    const fullInsights = ref<FullInsight[]>([]);

    watch([insights], () => {
      // first fill it without images, once the downloads finish, fill them in
      // use '' to represent that the thumbnail is loading
      fullInsights.value = insights.value.map(insight => ({ ...insight, image: '' }));
      (async () => {
        // Insight IDs should only be undefined before they've been saved on
        //  the backend, so it is safe to assert the string[] type here.
        const ids = insights.value.map(insight => insight.id) as string[];
        // First, get just the thumbnails, set annotation_state to null to indicate it's still coming
        const images = await fetchImagesForInsights(ids);
        // If insights changed, abort
        if (_.xor(ids, insights.value.map(insight => insight.id)).length > 0) {
          return;
        }
        // FIXME: FullInsight.annotation_state should never be null.
        // Either this should be `undefined` or more likely we should update
        //  the type to be optionally `null` instead of `undefined`.
        // @ts-ignore
        fullInsights.value = images.filter(i => ids.includes(i.id))
          .map(i => ({ ...i, annotation_state: null }));

        // Then, get the annotation_state, this is needed to open an insight
        const annotations = await fetchPartialInsights({ id: ids }, ['id', 'annotation_state']);
        fullInsights.value.forEach(insight => {
          const annotation = annotations.find(i => i.id === insight.id);
          insight.annotation_state = (annotations && annotation.annotation_state)
            ? annotation.annotation_state
            : undefined;
        });
      })();
    });

    const questions = computed(() => sortQuestionsByPath(store.getters['analysisChecklist/questions']));

    return {
      fullInsights,
      reFetchInsights,
      questions,
      store,
      toaster
    };
  },
  computed: {
    ...mapGetters({
      projectMetadata: 'app/projectMetadata',
      projectId: 'app/project'
    }),
    exportOptions() {
      const insightLabel = `Export ${this.insightsToExport.length}` +
      ` ${this.curatedInsightIds.length > 0 ? 'selected' : ''}` +
      ` insight${this.insightsToExport.length !== 1 ? 's' : ''}`;
      return [{
        value: EXPORT_OPTIONS.insights,
        label: insightLabel
      }, {
        value: EXPORT_OPTIONS.questions,
        label: 'Export All Questions & Insights'
      }];
    },
    searchedInsights(): FullInsight[] {
      if (this.search.length > 0) {
        const result = this.fullInsights.filter((insight) => {
          return insight.name.toLowerCase().includes(this.search.toLowerCase());
        });
        return result;
      } else {
        return this.fullInsights;
      }
    },
    selectedInsights(): FullInsight[] {
      if (this.curatedInsightIds.length > 0) {
        const curatedSet = this.fullInsights.filter(i => this.curatedInsightIds.find(e => e === i.id));
        return curatedSet;
      } else {
        return this.fullInsights;
      }
    },
    insightsToExport() {
      if (this.curatedInsightIds.length > 0) {
        return this.curatedInsightIds;
      }
      return this.searchedInsights;
    },
    insightsGroupedByQuestion() {
      const allInsightsGroupedByQuestions = InsightUtil.parseReportFromQuestionsAndInsights(this.fullInsights, this.questions);
      // filter the list by removing question/section items that have insights linked to them
      return allInsightsGroupedByQuestions.filter(item => {
        // if the item is an insight, always show it
        if (InsightUtil.instanceOfFullInsight(item)) return true;
        // now we have a question:
        const question = item as AnalyticalQuestion;
        // if the question has no linked insights, always show it
        if (question.linked_insights.length === 0) return true;
        // now we have a question that may have linked insights, but is this really the case?
        // sometimes, we have data quality issues where a question/section has linked insights IDs for insights that do not exist anymore
        let validQuestion = false;
        if (this.fullInsights && this.fullInsights.length > 0) {
          // insights have been loaded, so we might as well use them to better validate questions
          // if all linked insights do not exist anymore, then this question should be shown
          validQuestion = true;
          question.linked_insights.forEach(insightId => {
            const indx = this.fullInsights.findIndex(ins => ins.id === insightId);
            if (indx >= 0) {
              validQuestion = false;
            }
          });
        }
        return validQuestion;
      });
    }
  },
  methods: {
    ...mapActions({
      hideInsightPanel: 'insightPanel/hideInsightPanel',
      setCurrentPane: 'insightPanel/setCurrentPane',
      setUpdatedInsight: 'insightPanel/setUpdatedInsight',
      setInsightList: 'insightPanel/setInsightList',
      setRefreshDatacubes: 'insightPanel/setRefreshDatacubes',
      setReviewIndex: 'insightPanel/setReviewIndex',
      setReviewMode: 'insightPanel/setReviewMode'
    }),
    getInsightIndex(targetInsight: FullInsight, insights: FullInsight[]) {
      return insights.findIndex(ins => ins.id === targetInsight.id);
    },
    closeInsightPanel() {
      this.hideInsightPanel();
      this.activeInsightId = null;
    },
    // FIXME: add type
    startDrag(evt: any, insight: FullInsight) {
      evt.currentTarget.style.border = '3px dashed black';

      evt.dataTransfer.dropEffect = 'move';
      evt.dataTransfer.effectAllowed = 'move';
      evt.dataTransfer.setData('insight_id', insight.id);

      const img = document.createElement('img');
      const canvas = document.createElement('canvas');
      // Assert not null
      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
      // Setting img src
      img.src = insight.image;

      // Drawing to canvas with a smaller size
      canvas.width = img.width * 0.2;
      canvas.height = img.height * 0.2;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // add to ensure visibility
      document.body.append(canvas);

      // Setting drag image with drawn canvas image
      evt.dataTransfer.setDragImage(canvas, 0, 0);
    },
    // FIXME: add type
    dragEnd(evt: any) {
      const matches = document.querySelectorAll('canvas');
      matches.forEach(c => c.remove());

      evt.currentTarget.style.border = 'none';
    },
    editInsight(insight: FullInsight) {
      // FIXME: insight.annotation_state should never be null
      // FullInsight may not be the correct type for insight, or the condition
      //  below may need to be updated
      if (insight.image === '' || insight.annotation_state === null) {
        this.toaster(NOT_READY_ERROR, 'error', false);
        return;
      }
      const insightIndex = this.getInsightIndex(insight, this.searchedInsights);
      this.setUpdatedInsight(insight);
      this.setReviewIndex(insightIndex);
      this.setInsightList(this.searchedInsights);
      // open the preview in the edit mode
      this.setCurrentPane('review-edit-insight');
    },
    async removeInsight(insight: FullInsight) {
      // are removing a public insight?
      if (insight.visibility === 'public' && Array.isArray(insight.context_id) && insight.context_id.length > 0) {
        // is this the last public insight for the relevant dataube?
        //  if so, unpublish the model datacube
        const datacubeId = insight.context_id[0];
        // This component doesn't have access to `this.project`, the following
        //  line would have thrown an error if it was reached.
        // Is this code still used? If so, we need to add a getter for `project`
        const publicInsightCount = await InsightUtil.countPublicInsights(datacubeId, ''); // this.project);
        if (publicInsightCount === 1) {
          await unpublishDatacube(datacubeId, this.projectId);
          this.setRefreshDatacubes(true);
        }
      }

      const id = insight.id as string;
      // remove the insight from the server
      await InsightUtil.removeInsight(id, this.store);
      this.removeCuration(id);
      // refresh the latest list from the server
      this.reFetchInsights();
    },
    exportInsights(outputFormat: string) {
      let insights: FullInsight[] = [];
      let questions: AnalyticalQuestion[] | undefined;
      if (this.activeExportOption === EXPORT_OPTIONS.questions) {
        insights = this.fullInsights;
        questions = this.questions;
      } else {
        insights = this.selectedInsights;
      }
      switch (outputFormat) {
        case 'Word':
          InsightUtil.exportDOCX(insights, this.projectMetadata, questions);
          break;
        case 'Powerpoint':
          InsightUtil.exportPPTX(insights, this.projectMetadata, questions);
          break;
        default:
          break;
      }
    },
    isCuratedInsight(id: string) {
      return this.curatedInsightIds.reduce((res, ci) => {
        res = res || ci === id;
        return res;
      }, false);
    },
    openEditor(id: string) {
      if (id === this.activeInsightId) {
        this.activeInsightId = null;
        return;
      }
      this.activeInsightId = id;
    },
    removeCuration(id: string) {
      this.curatedInsightIds = this.curatedInsightIds.filter((ci) => ci !== id);
    },
    reviewInsight(insight: FullInsight) {
      if (insight.image === '' || insight.annotation_state === null) {
        this.toaster(NOT_READY_ERROR, 'error', false);
        return;
      }
      // open review modal (i.e., insight gallery view)
      const insightIndex = this.getInsightIndex(insight, this.searchedInsights);
      this.setUpdatedInsight(insight);
      this.setReviewIndex(insightIndex);
      this.setInsightList(this.searchedInsights);
      this.setCurrentPane('review-insight');
    },
    // If `section` is `null`, goes to the first item in the checklist.
    // If `insightId` is `null`, goes to the first item in `section`.
    // Else, goes to the insight with ID `insightId` within `section`.
    reviewChecklist(
      section: AnalyticalQuestion | null,
      insightId: string | null
    ) {
      if (this.insightsGroupedByQuestion.length < 1) return;
      const indexToStartReviewing = InsightUtil.getIndexInSectionsAndInsights(
        this.insightsGroupedByQuestion,
        section,
        insightId,
        this.questions
      );
      const insightOrSection =
        this.insightsGroupedByQuestion[indexToStartReviewing];
      // FIXME: previously this conditional looked like:
      // if (insight.image === '' || insight.annotation_state === null) {
      // Which was wonky because "insight" could be either
      //  AnalyticalQuestion or Insight or FullInsight, and
      // - AnalyticalQuestion and Insight don't have either property
      // - FullInsight.annotation_state should never be `null`
      // We should clean up / simplify this logic, unless we first complete the
      //  planned work to not require image/annotation_state to be loaded before
      //  switching to review mode.
      const isSection = InsightUtil.instanceOfQuestion(insightOrSection);
      const isFullInsight =
        InsightUtil.instanceOfFullInsight(insightOrSection) &&
        insightOrSection.image !== '';
      if (!isSection && !isFullInsight) {
        this.toaster(NOT_READY_ERROR, 'error', false);
        return;
      }
      this.setReviewMode(true);
      this.setReviewIndex(indexToStartReviewing);
      this.setUpdatedInsight(insightOrSection);
      this.setInsightList(this.insightsGroupedByQuestion);
      this.setCurrentPane('review-insight');
    },
    toggleExport(id: string) {
      this.activeExportOption = id;
    },
    updateCuration(id: string) {
      if (this.isCuratedInsight(id)) {
        this.removeCuration(id);
      } else {
        this.curatedInsightIds.push(id);
      }
    }
  }
});
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.list-insights-modal-container {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  height: 100vh;
}

.tab-controls {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.5em;
}

.export-options {
  flex-shrink: 0;
}

.checklist {
  margin: 10px;
  overflow: auto;
  width: 380px;
}

.cards {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  .search {
    margin-bottom: 10px;
  }
  .pane-content {
    overflow: auto;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
  }
}
.list {
  background-color: $background-light-2;
  display: inline-block;
  height: 100%;
  overflow: auto;
}


.body {
  flex: 1;
  min-height: 0;
  background: $background-light-2;
}

.body-main-content {
  flex: 1;
  min-width: 0;
  isolation: isolate;
  gap: 10px;
  margin: 10px;
  margin-left: 0;
}

.analysis-question {
  margin: 0;
  margin-bottom: 10px;
}

.list-question-group {
  margin-bottom: 20px;
}

</style>
