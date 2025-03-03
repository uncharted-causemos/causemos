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
          :insights-by-section="insightsBySection"
          @item-click="reviewChecklist"
          @update-section-title="updateSectionTitle"
          @add-section="addSection"
          @delete-section="deleteSection"
          @move-section-above-section="moveSectionAboveSection"
          @remove-insight-from-section="removeInsightFromSection"
          @move-insight="moveInsight"
        >
          <button
            class="btn btn-call-to-action review-button"
            :disabled="insightsBySection.length === 0"
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
          />
          <SelectButton
            :options="exportOptions"
            :model-value="activeExportOption"
            option-label="label"
            option-value="value"
            @update:model-value="setActiveExportOption"
          />
          as
          <Button
            severity="secondary"
            outlined
            label="PowerPoint"
            @click="() => exportInsights('Powerpoint')"
          />
          <Button
            severity="secondary"
            outlined
            label="Word"
            @click="() => exportInsights('Word')"
          />
        </div>
        <div class="cards">
          <div v-if="searchedInsights.length > 0" class="pane-content">
            <insight-card
              v-for="insight in searchedInsights"
              :active-insight="activeInsightId ?? ''"
              :card-mode="true"
              :curated="isCuratedInsight(insight.id as string)"
              :key="insight.id"
              :insight="insight"
              @remove-insight="removeInsight(insight)"
              @edit-insight="startEditingInsight(insight)"
              @open-editor="openEditor(insight.id as string)"
              @select-insight="reviewInsight(insight)"
              @update-curation="updateCuration(insight.id as string)"
              draggable="true"
              @dragstart="startDrag($event, insight)"
              @dragend="dragEnd($event)"
            />
          </div>
          <message-display class="pane-content" v-else :message="messageNoData" />
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

import { computed, defineComponent } from 'vue';

import ListAnalyticalQuestionsPane from '@/components/analytical-questions/list-analytical-questions-pane.vue';
import useInsightsData from '@/composables/useInsightsData';
import useToaster from '@/composables/useToaster';
import MessageDisplay from '@/components/widgets/message-display.vue';
import InsightUtil from '@/utils/insight-util';
import { fetchFullInsights, removeInsight } from '@/services/insight-service';
import {
  AnalyticalQuestion,
  LegacyInsight,
  NewInsight,
  SectionWithInsights,
} from '@/types/Insight';
import useQuestionsData from '@/composables/useQuestionsData';
import { getBibiographyFromCagIds } from '@/services/bibliography-service';
import SelectButton from 'primevue/selectbutton';
import Button from 'primevue/button';
import useInsightManager from '@/composables/useInsightManager';

const EXPORT_OPTIONS = {
  insights: 'insights',
  questions: 'questions',
};

export default defineComponent({
  name: 'ListInsightsModal',
  components: {
    FullScreenModalHeader,
    InsightCard,
    MessageDisplay,
    ListAnalyticalQuestionsPane,
    SelectButton,
    Button,
  },
  data: () => ({
    activeExportOption: EXPORT_OPTIONS.insights,
    activeInsightId: null as string | null,
    curatedInsightIds: [] as string[],
    messageNoData: INSIGHTS.NO_DATA,
    search: '',
  }),
  setup() {
    const store = useStore();
    const toaster = useToaster();
    const { insights, reFetchInsights } = useInsightsData();
    const {
      questionsList,
      updateSectionTitle,
      addSection,
      deleteSection,
      moveSectionAboveSection,
      removeInsightFromSection,
      moveInsight,
    } = useQuestionsData();
    const insightsBySection = computed<SectionWithInsights[]>(() => {
      // FIXME: there's an edge case where insightsBySection is out of date when
      //  assigning an insight to a section, since insightsBySection is
      //  recalculated as soon as questionsList is updated, but fullInsights
      //  haven't been refetched yet, or updated so the linked_insights.
      //  list is correct.
      return questionsList.value.map((section) => {
        // FIXME: optimize by using maps
        const _insights = section.linked_insights
          .map((insightId) => insights.value.find((insight) => insight.id === insightId))
          .filter((insight) => insight !== undefined);
        return {
          section,
          insights: _insights,
        } as SectionWithInsights;
      });
    });

    const { editInsight, setReviewPosition, reviewInsights, hideInsightModal } =
      useInsightManager();

    return {
      fullInsights: insights,
      reFetchInsights,
      updateSectionTitle,
      addSection,
      deleteSection,
      moveSectionAboveSection,
      removeInsightFromSection,
      moveInsight,
      insightsBySection,
      questionsList,
      store,
      toaster,
      editInsight,
      setReviewPosition,
      reviewInsights,
      hideInsightModal,
    };
  },
  computed: {
    ...mapGetters({
      projectMetadata: 'app/projectMetadata',
      projectId: 'app/project',
    }),
    exportOptions() {
      const insightLabel =
        `Export ${this.insightsToExport.length}` +
        ` ${this.curatedInsightIds.length > 0 ? 'selected' : ''}` +
        ` insight${this.insightsToExport.length !== 1 ? 's' : ''}`;
      return [
        {
          value: EXPORT_OPTIONS.insights,
          label: insightLabel,
        },
        {
          value: EXPORT_OPTIONS.questions,
          label: 'Export all questions and insights',
        },
      ];
    },
    searchedInsights(): (LegacyInsight | NewInsight)[] {
      if (this.search.length > 0) {
        const result = this.fullInsights.filter((insight) => {
          return insight.name.toLowerCase().includes(this.search.toLowerCase());
        });
        return result;
      } else {
        return this.fullInsights;
      }
    },
    selectedInsights(): (LegacyInsight | NewInsight)[] {
      if (this.curatedInsightIds.length > 0) {
        const curatedSet = this.fullInsights.filter((i) =>
          this.curatedInsightIds.find((e) => e === i.id)
        );
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
  },
  methods: {
    ...mapActions({
      enableOverlay: 'app/enableOverlay',
      disableOverlay: 'app/disableOverlay',
    }),
    closeInsightPanel() {
      this.hideInsightModal();
      this.activeInsightId = null;
    },
    startDrag(evt: DragEvent, insight: LegacyInsight | NewInsight) {
      if (evt.dataTransfer === null || !(evt.currentTarget instanceof HTMLElement)) {
        return;
      }
      evt.currentTarget.style.border = '3px dashed black';

      evt.dataTransfer.dropEffect = 'link';
      evt.dataTransfer.effectAllowed = 'link';
      evt.dataTransfer.setData('insight_id', insight.id as string);

      const img = (evt.target as HTMLElement).querySelector('img');
      if (img) {
        evt.dataTransfer.setDragImage(img, 0, 0);
      }
    },
    dragEnd(evt: DragEvent) {
      (evt.currentTarget as HTMLElement).style.border = 'none';
    },
    startEditingInsight(insight: LegacyInsight | NewInsight) {
      this.editInsight(insight.id as string);
    },
    async removeInsight(insight: LegacyInsight | NewInsight) {
      const id = insight.id as string;
      // remove the insight from the server
      await removeInsight(id);
      this.removeCuration(id);
      // refresh the latest list from the server
      this.reFetchInsights();
    },
    async exportInsights(outputFormat: string) {
      const questions =
        this.activeExportOption === EXPORT_OPTIONS.questions ? this.questionsList : undefined;
      const insightIds =
        this.activeExportOption === EXPORT_OPTIONS.questions
          ? this.fullInsights.map((d) => d.id)
          : this.selectedInsights.map((d) => d.id);

      this.enableOverlay('Preparing to export insights');
      const insights = await fetchFullInsights({ id: insightIds as string[] });
      this.disableOverlay();

      const bibliographyMap = await getBibiographyFromCagIds([]);

      switch (outputFormat) {
        case 'Word':
          InsightUtil.exportDOCX(insights, this.projectMetadata, questions, bibliographyMap);
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
    reviewInsight(insight: LegacyInsight | NewInsight) {
      this.setReviewPosition({ insightId: insight.id as string, sectionId: null });
      this.reviewInsights();
    },
    reviewChecklist(section: AnalyticalQuestion | null, insightId: string | null) {
      if (this.insightsBySection.length < 1) return;
      // If `section` is `null`, go to the first item in the checklist.
      const _section = section ?? this.insightsBySection[0].section;
      const _sectionId = _section.id as string;
      // If `insightId` is `null`, goes to the first insight in `section`.
      // Else, goes to the insight with ID `insightId` within `section`.
      const firstInsight = _section.linked_insights.length > 0 ? _section.linked_insights[0] : null;
      const _insightId = insightId ?? firstInsight;

      this.setReviewPosition({
        sectionId: _sectionId,
        insightId: _insightId as string,
      });
      this.reviewInsights();
    },
    setActiveExportOption(id: string) {
      this.activeExportOption = id;
    },
    updateCuration(id: string) {
      if (this.isCuratedInsight(id)) {
        this.removeCuration(id);
      } else {
        this.curatedInsightIds.push(id);
      }
    },
  },
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.list-insights-modal-container {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  height: 100vh;
  background: var(--p-surface-50);
}

.tab-controls {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.5em;
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
  .pane-content {
    overflow: auto;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
  }
}
.search {
  flex: 1;
  min-width: 0;
}

.body {
  flex: 1;
  min-height: 0;
}

.body-main-content {
  flex: 1;
  min-width: 0;
  isolation: isolate;
  gap: 10px;
  padding: 10px;
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
