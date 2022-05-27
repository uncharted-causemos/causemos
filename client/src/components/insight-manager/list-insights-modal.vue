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
            class="btn btn-primary btn-call-for-action review-button"
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
import {
  AnalyticalQuestion,
  FullInsight,
  SectionWithInsights
} from '@/types/Insight';
import useQuestionsData from '@/services/composables/useQuestionsData';

const EXPORT_OPTIONS = {
  insights: 'insights',
  questions: 'questions'
};

// const NOT_READY_ERROR = 'Insights are still loading. Try again later.';

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
      })();
    });

    const {
      questionsList,
      updateSectionTitle,
      addSection,
      deleteSection,
      moveSectionAboveSection,
      removeInsightFromSection,
      moveInsight
    } = useQuestionsData();
    const insightsBySection = computed<SectionWithInsights[]>(() => {
      // FIXME: there's an edge case where insightsBySection is out of date when
      //  assigning an insight to a section, since insightsBySection is
      //  recalculated as soon as questionsList is updated, but fullInsights
      //  haven't been refetched yet, or updated so the linked_insights.
      //  list is correct.
      return questionsList.value.map(section => {
        // FIXME: optimize by using maps
        const _insights = section.linked_insights
          .map(insightId =>
            fullInsights.value.find(insight => insight.id === insightId)
          )
          .filter(insight => insight !== undefined);
        return {
          section,
          insights: _insights
        } as SectionWithInsights;
      });
    });

    return {
      fullInsights,
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
    }
  },
  methods: {
    ...mapActions({
      enableOverlay: 'app/enableOverlay',
      disableOverlay: 'app/disableOverlay',
      hideInsightPanel: 'insightPanel/hideInsightPanel',
      setCurrentPane: 'insightPanel/setCurrentPane',
      setUpdatedInsight: 'insightPanel/setUpdatedInsight',
      setInsightsBySection: 'insightPanel/setInsightsBySection',
      setRefreshDatacubes: 'insightPanel/setRefreshDatacubes',
      setPositionInReview: 'insightPanel/setPositionInReview'
    }),
    closeInsightPanel() {
      this.hideInsightPanel();
      this.activeInsightId = null;
    },
    startDrag(evt: DragEvent, insight: FullInsight) {
      if (
        evt.dataTransfer === null ||
        !(evt.currentTarget instanceof HTMLElement)
      ) {
        return;
      }
      evt.currentTarget.style.border = '3px dashed black';

      evt.dataTransfer.dropEffect = 'link';
      evt.dataTransfer.effectAllowed = 'link';
      evt.dataTransfer.setData('insight_id', insight.id as string);

      InsightUtil.setInsightThumbnailAsDragImage(
        insight.thumbnail as string,
        evt.dataTransfer
      );
    },
    dragEnd(evt: DragEvent) {
      (evt.currentTarget as HTMLElement).style.border = 'none';
    },
    editInsight(insight: FullInsight) {
      this.setUpdatedInsight(insight);
      const dummySection = InsightUtil.createEmptyChecklistSection();
      this.setPositionInReview({
        sectionId: dummySection.id,
        insightId: insight.id
      });
      this.setInsightsBySection([{
        section: dummySection,
        insights: this.searchedInsights
      }]);
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
    async exportInsights(outputFormat: string) {
      let insights: FullInsight[] = [];
      let questions: AnalyticalQuestion[] | undefined;

      const imageMap = new Map();
      const ids = this.activeExportOption === EXPORT_OPTIONS.questions
        ? this.fullInsights.map(d => d.id)
        : this.selectedInsights.map(d => d.id);

      this.enableOverlay('Collecting insights data');
      const images = await fetchPartialInsights({ id: ids } as any, ['id', 'image']);
      images.forEach(d => {
        imageMap.set(d.id, d.image);
      });
      this.disableOverlay();

      if (this.activeExportOption === EXPORT_OPTIONS.questions) {
        this.fullInsights.forEach(insight => {
          insight.image = imageMap.get(insight.id);
        });
        insights = this.fullInsights;
        questions = this.questionsList;
      } else {
        this.selectedInsights.forEach(insight => {
          insight.image = imageMap.get(insight.id);
        });
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
      // open review modal (i.e., insight gallery view)
      this.setUpdatedInsight(insight);
      const dummySection = InsightUtil.createEmptyChecklistSection();
      this.setPositionInReview({
        sectionId: dummySection.id,
        insightId: insight.id
      });
      this.setInsightsBySection([{
        section: dummySection,
        insights: this.searchedInsights
      }]);
      this.setCurrentPane('review-insight');
    },
    reviewChecklist(
      section: AnalyticalQuestion | null,
      insightId: string | null
    ) {
      if (this.insightsBySection.length < 1) return;
      // If `section` is `null`, go to the first item in the checklist.
      const _section = section ?? this.insightsBySection[0].section;
      const _sectionId = _section.id as string;
      // If `insightId` is `null`, goes to the first insight in `section`.
      // Else, goes to the insight with ID `insightId` within `section`.
      const firstInsight = _section.linked_insights.length > 0
        ? _section.linked_insights[0]
        : null;
      const _insightId = insightId ?? firstInsight;

      const insightOrSection = _insightId === null
        ? _section
        : this.fullInsights.find(insight => insight.id === _insightId);

      this.setUpdatedInsight(insightOrSection);
      this.setPositionInReview({
        sectionId: _sectionId,
        insightId: _insightId
      });
      this.setInsightsBySection(this.insightsBySection);
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
