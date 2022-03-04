<template>
  <div class="list-insights-modal-container">
    <full-screen-modal-header
      icon="angle-left"
      nav-back-label="Exit Saved Insights"
      @close="closeInsightPanel"
    >
    </full-screen-modal-header>

    <div class="body flex">
      <analytical-questions-panel />

      <!-- body -->
      <div class="body-main-content flex-col">

        <div class="tab-controls">
          <radio-button-group
            :buttons="VIEW_OPTIONS"
            :selected-button-value="activeTabId"
            @button-clicked="switchTab"
          />
          <div class="export">
            <radio-button-group
              :buttons="exportOptions"
              :selected-button-value="activeExportOption"
              @button-clicked="toggleExport"
            />
            <span> as </span>
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
        </div>
        <div
          v-if="activeTabId === VIEW_OPTIONS[0].value"
          class="cards"
        >
          <input
            v-model="search"
            v-focus
            type="text"
            class="search form-control"
            placeholder="Search insights"
          >
          <div
            v-if="searchedInsights.length > 0"
            class="pane-content"
          >
            <insight-card
              v-for="insight in searchedInsights"
              :active-insight="activeInsight"
              :card-mode="true"
              :curated="isCuratedInsight(insight.id)"
              :key="insight.id"
              :insight="insight"
              @remove-insight="removeInsight(insight)"
              @edit-insight="editInsight(insight)"
              @open-editor="openEditor(insight.id)"
              @select-insight="reviewInsight(insight)"
              @update-curation="updateCuration(insight.id)"
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

        <div
          v-else-if="activeTabId === VIEW_OPTIONS[1].value"
          class="list"
        >
          <div
            v-if="questions.length > 0"
            class="pane-content"
          >
            <div
              v-for="questionItem in questions"
              :key="questionItem.id"
              class="list-question-group">
              <h3 class="analysis-question">{{ questionItem.question }}</h3>
              <message-display
                class="pane-content"
                v-if="questionItem.linked_insights.length === 0"
                :message="'No insights assigned to this question.'"
              />
              <insight-card
                v-for="insight in getInsightsForQuestion(questionItem)"
                :key="insight.id"
                :insight="insight"
                :active-insight="activeInsight"
                :show-description="true"
                :show-question="false"
                @remove-insight="removeInsight(insight)"
                @open-editor="openEditor(insight.id)"
                @select-insight="reviewInsight(insight)"
                @edit-insight="editInsight(insight)"
              />
            </div>
          </div>
          <message-display
            class="pane-content"
            v-else
            :message="'Add a new question to see a list of insights, organized by question.'"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import _ from 'lodash';
import { mapGetters, mapActions, useStore } from 'vuex';

import { INSIGHTS } from '@/utils/messages-util';

import InsightCard from '@/components/insight-manager/insight-card';
import FullScreenModalHeader from '@/components/widgets/full-screen-modal-header';

import { ref, watch, computed } from 'vue';

import AnalyticalQuestionsPanel from '@/components/analytical-questions/analytical-questions-panel';
import useInsightsData from '@/services/composables/useInsightsData';
import useToaster from '@/services/composables/useToaster';
import MessageDisplay from '@/components/widgets/message-display';
import InsightUtil from '@/utils/insight-util';
import { unpublishDatacube } from '@/utils/datacube-util';
import RadioButtonGroup from '../widgets/radio-button-group.vue';
import { fetchPartialInsights } from '@/services/insight-service';

const VIEW_OPTIONS = [
  {
    value: 'cards',
    label: 'Cards'
  }, {
    value: 'list',
    label: 'List'
  }
];

const EXPORT_OPTIONS = {
  insights: 'insights',
  questions: 'questions'
};

const NOT_READY_ERROR = 'Insights are still loading. Try again later.';

export default {
  name: 'ListInsightsModal',
  components: {
    FullScreenModalHeader,
    InsightCard,
    MessageDisplay,
    AnalyticalQuestionsPanel,
    RadioButtonGroup
  },
  data: () => ({
    activeExportOption: EXPORT_OPTIONS.insights,
    activeInsight: null,
    activeTabId: VIEW_OPTIONS[0].value,
    curatedInsights: [],
    messageNoData: INSIGHTS.NO_DATA,
    search: '',
    VIEW_OPTIONS
  }),
  setup() {
    const store = useStore();
    const toaster = useToaster();
    // prevent insight fetches if the gallery is closed
    const preventFetches = computed(() => !store.getters['insightPanel/isPanelOpen']);
    const { insights, reFetchInsights, fetchImagesForInsights } = useInsightsData(preventFetches);
    const fullInsights = ref([])/* as Ref<FullInsight[]> */;

    watch([insights], () => {
      // first fill it without images, once the downloads finish, fill them in
      // use '' to represent that the thumbnail is loading
      fullInsights.value = insights.value.map(insight => ({ ...insight, thumbnail: '' }));
      (async () => {
        const ids = insights.value.map(insight => insight.id);
        // First, get just the thumbnails, set annotation_state to null to indicate it's still coming
        const images = await fetchImagesForInsights(ids);
        // If insights changed, abort
        if (_.xor(ids, insights.value.map(insight => insight.id)).length > 0) {
          return;
        }
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

    return {
      fullInsights,
      reFetchInsights,
      store,
      toaster
    };
  },
  computed: {
    ...mapGetters({
      projectMetadata: 'app/projectMetadata',
      countInsights: 'insightPanel/countInsights',
      questions: 'analysisChecklist/questions',
      projectId: 'app/project'
    }),
    exportOptions() {
      const insightLabel = `Export ${this.insightsToExport.length}` +
      ` ${this.curatedInsights.length > 0 ? 'selected' : ''}` +
      ` insight${this.insightsToExport.length !== 1 ? 's' : ''}`;
      return [{
        value: EXPORT_OPTIONS.insights,
        label: insightLabel
      }, {
        value: EXPORT_OPTIONS.questions,
        label: 'Export All Questions & Insights'
      }];
    },
    searchedInsights() {
      if (this.search.length > 0) {
        const result = this.fullInsights.filter((insight) => {
          return insight.name.toLowerCase().includes(this.search.toLowerCase());
        });
        return result;
      } else {
        return this.fullInsights;
      }
    },
    selectedInsights() {
      if (this.curatedInsights.length > 0) {
        const curatedSet = this.fullInsights.filter(i => this.curatedInsights.find(e => e === i.id));
        return curatedSet;
      } else {
        return this.fullInsights;
      }
    },
    insightsToExport() {
      if (this.curatedInsights.length > 0) {
        return this.curatedInsights;
      }
      return this.searchedInsights;
    }
  },
  mounted() {
    this.curatedInsights = [];
  },
  methods: {
    ...mapActions({
      hideInsightPanel: 'insightPanel/hideInsightPanel',
      setCountInsights: 'insightPanel/setCountInsights',
      setCurrentPane: 'insightPanel/setCurrentPane',
      setUpdatedInsight: 'insightPanel/setUpdatedInsight',
      setInsightList: 'insightPanel/setInsightList',
      setRefreshDatacubes: 'insightPanel/setRefreshDatacubes'
    }),
    getInsightsForQuestion(question) {
      return this.fullInsights.filter(i => question.linked_insights.includes(i.id));
    },
    closeInsightPanel() {
      this.hideInsightPanel();
      this.activeInsight = null;
    },
    startDrag(evt, insight) {
      evt.currentTarget.style.border = '3px dashed black';

      evt.dataTransfer.dropEffect = 'move';
      evt.dataTransfer.effectAllowed = 'move';
      evt.dataTransfer.setData('insight_id', insight.id);

      const img = document.createElement('img');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      // Setting img src
      img.src = insight.thumbnail;

      // Drawing to canvas with a smaller size
      canvas.width = img.width * 0.2;
      canvas.height = img.height * 0.2;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // add to ensure visibility
      document.body.append(canvas);

      // Setting drag image with drawn canvas image
      evt.dataTransfer.setDragImage(canvas, 0, 0);
    },
    dragEnd(evt) {
      const matches = document.querySelectorAll('canvas');
      matches.forEach(c => c.remove());

      evt.currentTarget.style.border = 'none';
    },
    editInsight(insight) {
      if (insight.thumbnail === '' || insight.annotation_state === null) {
        this.toaster(NOT_READY_ERROR, 'error', false);
        return;
      }
      this.setUpdatedInsight(insight);
      this.setInsightList(this.searchedInsights);
      // open the preview in the edit mode
      this.setCurrentPane('review-edit-insight');
    },
    async removeInsight(insight) {
      // are removing a public insight?
      if (insight.visibility === 'public' && Array.isArray(insight.context_id) && insight.context_id.length > 0) {
        // is this the last public insight for the relevant dataube?
        //  if so, unpublish the model datacube
        const datacubeId = insight.context_id[0];
        const publicInsightCount = await InsightUtil.countPublicInsights(datacubeId, this.project);
        if (publicInsightCount === 1) {
          await unpublishDatacube(datacubeId, this.projectId);
          this.setRefreshDatacubes(true);
        }
      }

      const id = insight.id;
      // remove the insight from the server
      InsightUtil.removeInsight(id, this.store);
      this.removeCuration(id);
      // refresh the latest list from the server
      this.reFetchInsights();
    },
    exportInsights(item) {
      const props = [];
      if (this.activeExportOption === EXPORT_OPTIONS.questions) {
        props.push(this.fullInsights, this.projectMetadata, this.questions);
      } else {
        props.push(this.selectedInsights, this.projectMetadata);
      }
      switch (item) {
        case 'Word':
          InsightUtil.exportDOCX(...props);
          break;
        case 'Powerpoint':
          InsightUtil.exportPPTX(...props);
          break;
        default:
          break;
      }
    },
    isCuratedInsight(id) {
      return this.curatedInsights.reduce((res, ci) => {
        res = res || ci === id;
        return res;
      }, false);
    },
    openEditor(id) {
      if (id === this.activeInsight) {
        this.activeInsight = null;
        return;
      }
      this.activeInsight = id;
    },
    removeCuration(id) {
      this.curatedInsights = this.curatedInsights.filter((ci) => ci !== id);
    },
    reviewInsight(insight) {
      if (insight.thumbnail === '' || insight.annotation_state === null) {
        this.toaster(NOT_READY_ERROR, 'error', false);
        return;
      }
      // open review modal (i.e., insight gallery view)
      this.setUpdatedInsight(insight);
      this.setInsightList(this.searchedInsights);
      this.setCurrentPane('review-insight');
    },
    switchTab(id) {
      this.activeInsight = null;
      this.activeTabId = id;

      // FIXME: reload insights since questions most recent question stuff may not be up to date
    },
    toggleExport(id) {
      this.activeExportOption = id;
    },
    updateCuration(id) {
      if (this.isCuratedInsight(id)) {
        this.removeCuration(id);
      } else {
        this.curatedInsights.push(id);
      }
    }
  }
};
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
  justify-content: space-between;
}

.export {
  display: flex;
  gap: 5px;
  align-items: center;
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
