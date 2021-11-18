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
          <tab-bar
            class="tabs"
            :active-tab-id="activeTabId"
            :tabs="tabs"
            @tab-click="switchTab"
          />
          <div class="export">
            <dropdown-button
              :inner-button-label="'Export insight(s)'"
              :is-dropdown-left-aligned="true"
              :items="['Powerpoint', 'Word']"
              class="export-dropdown"
              @item-selected="exportSelectedInsights"
            />
          </div>
        </div>
        <div
          v-if="activeTabId === tabs[0].id"
          class="cards"
        >
          <div class="search">
            <input
              v-model="search"
              v-focus
              type="text"
              class="form-control"
              placeholder="Search insights"
            >
          </div>
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
              @delete-insight="removeInsight(insight.id)"
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
          v-else-if="activeTabId === tabs[1].id"
          class="list"
        >
          <div
            v-if="questions.length > 0"
            class="pane-content"
          >
            <div
              v-for="questionItem in questions"
              :key="questionItem.id"
              style="margin-bottom: 5rem;">
              <h3 class="analysis-question">{{questionItem.question}}</h3>
              <insight-card
                v-for="insight in getInsightsByIDs(questionItem.linked_insights)"
                :key="insight.id"
                :insight="insight"
                :show-description="true"
                :show-question="false"
                @delete-insight="removeInsight(insight.id)"
                @open-editor="openEditor(insight.id)"
                @select-insight="selectInsight(insight)"
              />
            </div>
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

<script>
import { mapGetters, mapActions, useStore } from 'vuex';

import { INSIGHTS } from '@/utils/messages-util';

import InsightCard from '@/components/insight-manager/insight-card';
import TabBar from '@/components/widgets/tab-bar';
import FullScreenModalHeader from '@/components/widgets/full-screen-modal-header';
import DropdownButton from '@/components/dropdown-button.vue';

import router from '@/router';
import { computed } from 'vue';

import AnalyticalQuestionsPanel from '@/components/analytical-questions/analytical-questions-panel';
import useInsightsData from '@/services/composables/useInsightsData';
import MessageDisplay from '@/components/widgets/message-display';
import InsightUtil from '@/utils/insight-util';

const INSIGHT_TABS = [
  {
    id: 'cards',
    name: 'Cards'
  }, {
    id: 'list',
    name: 'List'
  }
];


export default {
  name: 'ListInsightsModal',
  components: {
    DropdownButton,
    FullScreenModalHeader,
    InsightCard,
    MessageDisplay,
    TabBar,
    AnalyticalQuestionsPanel
  },
  data: () => ({
    activeInsight: null,
    activeTabId: INSIGHT_TABS[0].id,
    curatedInsights: [],
    messageNoData: INSIGHTS.NO_DATA,
    search: '',
    selectedInsight: null,
    tabs: INSIGHT_TABS
  }),
  setup() {
    const store = useStore();
    const questions = computed(() => store.getters['analysisChecklist/questions']);

    const { insights: listInsights, getInsightsByIDs, reFetchInsights } = useInsightsData();

    return {
      listInsights,
      questions,
      getInsightsByIDs,
      reFetchInsights,
      store
    };
  },
  computed: {
    ...mapGetters({
      projectMetadata: 'app/projectMetadata',
      countInsights: 'insightPanel/countInsights'
    }),
    searchedInsights() {
      if (this.search.length > 0) {
        const result = this.listInsights.filter((insight) => {
          return insight.name.toLowerCase().includes(this.search.toLowerCase());
        });
        return result;
      } else {
        return this.listInsights;
      }
    },
    selectedInsights() {
      if (this.curatedInsights.length > 0) {
        const curatedSet = this.listInsights.filter(i => this.curatedInsights.find(e => e === i.id));
        return curatedSet;
      } else {
        return this.listInsights;
      }
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
      setInsightList: 'insightPanel/setInsightList'
    }),
    closeInsightPanel() {
      this.hideInsightPanel();
      this.activeInsight = null;
      this.selectedInsight = null;
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
      this.setUpdatedInsight(insight);
      this.setCurrentPane('edit-insight');
    },
    removeInsight(id) {
      // remove the insight from the server
      InsightUtil.removeInsight(id, this.store);
      this.removeCuration(id);
      // refresh the latest list from the server
      this.reFetchInsights();
    },
    exportSelectedInsights(item) {
      switch (item) {
        case 'Word':
          InsightUtil.exportDOCX(this.searchedInsights, this.projectMetadata);
          break;
        case 'Powerpoint':
          InsightUtil.exportPPTX(this.searchedInsights, this.projectMetadata);
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
      // open review modal (i.e., insight gallery view)
      this.setUpdatedInsight(insight);
      this.setInsightList(this.searchedInsights);
      this.setCurrentPane('review-insight');
    },
    selectInsight(insight) {
      if (insight === this.selectedInsight) {
        this.selectedInsight = null;
        return;
      }
      this.selectedInsight = insight;

      const savedURL = insight.url;
      const currentURL = this.$route.fullPath;
      const finalURL = InsightUtil.jumpToInsightContext(insight, currentURL);
      if (savedURL !== currentURL) {
        this.$router.push(finalURL);
      } else {
        router.push({
          query: {
            insight_id: insight.id
          }
        }).catch(() => {});
      }
      this.closeInsightPanel();
    },
    switchTab(id) {
      this.activeInsight = null;
      this.selectedInsight = null;
      this.activeTabId = id;

      // FIXME: reload insights since questions most recent question stuff may not be up to date
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

.export-dropdown {
  ::v-deep(.dropdown-btn) {
    padding-bottom: 10px;
    margin-right: 4px;
    background-color: lightgray;
    padding: 3px 6px;
    font-size: larger;
    &:hover {
      background-color: gray;
    }
  }
  ::v-deep(.dropdown-container) {
    position: absolute;
    right: 1rem;
    padding: 0;
    width: auto;
    height: fit-content;
    text-align: left;
    // Clip children overflowing the border-radius at the corners
    overflow: hidden;

    &.below {
      top: 96px;
    }
  }
}

.list-insights-modal-container {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  height: 100vh;
  .tab-controls {
    display: flex;
    flex: 0 0 auto;
    padding: 0 1rem;
    .tabs {
      flex: 1 1 auto;
    }
    .export {
      padding: 0.75rem 0 0 ;
      flex: 0 0 auto;
      .dropdown-container {

      }
    }
  }
  .cards {
    background-color: $background-light-2;
    flex: 1;
    min-height: 0;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    .search {
      display: flex;
      padding: 0 0 1rem;
      .form-control {
        flex: 1 1 auto;
      }
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
    padding: 1rem;
  }
}

.body {
  flex: 1;
  min-height: 0;
  background: $background-light-3;

  .body-main-content {
    flex: 1;
    min-width: 0;
    isolation: isolate;

    .analysis-question {
      padding: 5px 5px 10px;
      border: 1px solid #e5e5e5;
      margin: 0px 1rem 1rem 0px;
      background-color: white;
    }
  }
}

</style>
