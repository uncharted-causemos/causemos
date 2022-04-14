<template>
  <div class="list-context-insights-pane-container">
    <dropdown-button
      :inner-button-label="'Export'"
      :is-dropdown-left-aligned="true"
      :items="['Powerpoint', 'Word']"
      class="export-dropdown"
      @item-selected="exportContextInsight"
    />
    <button
      v-if="allowNewInsights"
      type="button"
      class="btn btn-primary btn-call-for-action"
      @click.stop="newInsight">
        <i class="fa fa-fw fa-star fa-lg" />
        New Insight
    </button>
    <div
      v-if="listContextInsights.length > 0"
      class="pane-content"
    >
      <div
        v-for="contextInsight in listContextInsights"
        :key="contextInsight.id"
        class="context-insight"
        :class="{ 'selected': selectedContextInsight === contextInsight, '': selectedContextInsight !== contextInsight }"
        @click="selectContextInsight(contextInsight)">
        <div class="context-insight-header">
          <div
            class="context-insight-title"
            :class="{ 'private-insight-title': contextInsight.visibility === 'private' }">
            {{ contextInsight.name }}
          </div>
          <options-button :dropdown-below="true">
            <template #content>
              <div
                class="dropdown-option"
                :class="{ disabled: isDisabled(contextInsight) }"
                @click="editContextInsight(contextInsight)"
              >
                <i class="fa fa-edit" />
                Edit
              </div>
              <div
                class="dropdown-option"
                :class="{ disabled: isDisabled(contextInsight) }"
                @click="deleteContextInsight(contextInsight)"
              >
                <i class="fa fa-trash" />
                Delete
              </div>
            </template>
          </options-button>
        </div>
        <div class="context-insight-content">
          <img
            v-if="contextInsight.thumbnail"
            :src="contextInsight.thumbnail"
            class="context-insight-thumbnail"
          >
          <div v-else class="context-insight-thumbnail"><i class="fa fa-spin fa-spinner" /></div>
          <div
            v-if="contextInsight.description.length > 0"
            class="context-insight-description"
            :class="{ 'private-insight-description': contextInsight.visibility === 'private' }">
            {{ contextInsight.description }}
          </div>
          <span
            v-else
            class="context-insight-empty-description">No description.
          </span>
        </div>
      </div>
    </div>
    <message-display
      v-else
      :message="messageNoData"
    />
    <button
      type="button"
      class="btn btn-default pane-footer"
      @click="openInsightsExplorer">
        <i class="fa fa-fw fa-star fa-lg" />
        Review All Insights
    </button>
  </div>
</template>

<script>
import _ from 'lodash';
import { ref, watch, computed } from 'vue';
import { mapGetters, mapActions, useStore } from 'vuex';
import DropdownButton from '@/components/dropdown-button.vue';

import { INSIGHTS } from '@/utils/messages-util';
import InsightUtil from '@/utils/insight-util';

import router from '@/router';
import useInsightsData from '@/services/composables/useInsightsData';
import { ProjectType } from '@/types/Enums';
import MessageDisplay from '@/components/widgets/message-display';
import OptionsButton from '@/components/widgets/options-button.vue';
import { unpublishDatacube } from '@/utils/datacube-util';

export default {
  name: 'ListContextInsightPane',
  components: {
    DropdownButton,
    MessageDisplay,
    OptionsButton
  },
  props: {
    allowNewInsights: {
      type: Boolean,
      default: true
    }
  },
  data: () => ({
    messageNoData: INSIGHTS.NO_DATA,
    selectedContextInsight: null
  }),
  setup() {
    const store = useStore();
    // the gallery opens over top of this side panel, prevent fetches while the gallery is open
    const preventFetches = computed(() => store.getters['insightPanel/isPanelOpen']);
    const { insights, reFetchInsights, fetchImagesForInsights } = useInsightsData(preventFetches, undefined, true);
    const listContextInsights = ref([])/* as Ref<FullInsight[]> */;

    watch([insights], () => {
      // first fill it without images, once the downloads finish, fill the image in
      // use '' to represent that the thumbnail is loading
      listContextInsights.value = insights.value.map(insight => ({ ...insight, image: '' }));
      (async () => {
        const images = await fetchImagesForInsights(insights.value.map(insight => insight.id));
        const ids = insights.value.map(insight => insight.id);
        listContextInsights.value = images.filter(i => ids.includes(i.id));
      })();
    });

    return {
      listContextInsights,
      reFetchInsights
    };
  },
  computed: {
    ...mapGetters({
      projectMetadata: 'app/projectMetadata',
      projectType: 'app/projectType',
      project: 'app/project',
      analysisId: 'dataAnalysis/analysisId'
    }),
    metadataSummary() {
      const projectCreatedDate = new Date(this.projectMetadata.created_at);
      const projectModifiedDate = new Date(this.projectMetadata.modified_at);
      return `Project: ${this.projectMetadata.name} - Created: ${projectCreatedDate.toLocaleString()} - ` +
        `Modified: ${projectModifiedDate.toLocaleString()} - Corpus: ${this.projectMetadata.corpus_id}`;
    }
  },
  methods: {
    ...mapActions({
      showInsightPanel: 'insightPanel/showInsightPanel',
      setCurrentPane: 'insightPanel/setCurrentPane',
      setUpdatedInsight: 'insightPanel/setUpdatedInsight',
      setInsightList: 'insightPanel/setInsightList',
      setRefreshDatacubes: 'insightPanel/setRefreshDatacubes',
      setSnapshotUrl: 'insightPanel/setSnapshotUrl'
    }),
    newInsight() {
      this.setSnapshotUrl(undefined);
      this.showInsightPanel();
      this.setUpdatedInsight(null);
      this.setCurrentPane('review-new-insight');
    },
    openInsightsExplorer() {
      this.showInsightPanel();
      this.setCurrentPane('list-insights');
    },
    exportContextInsight(item) {
      switch (item) {
        case 'Word':
          InsightUtil.exportDOCX(this.listContextInsights, this.projectMetadata);
          break;
        case 'Powerpoint':
          InsightUtil.exportPPTX(this.listContextInsights, this.projectMetadata);
          break;
        default:
          break;
      }
    },
    selectContextInsight(contextInsight) {
      if (contextInsight === this.selectedContextInsight) {
        this.selectedContextInsight = null;
        return;
      }
      this.selectedContextInsight = contextInsight;

      let savedURL = this.selectedContextInsight.url;
      const currentURL = this.$route.fullPath;

      // NOTE: applying an insight should not automatically set a specific datacube_id as a query param
      //  because, for example, the comparative analysis (region-ranking) page does not
      //  need/understand a specific datacube_id,
      //  and setting it regardless may have a negative side effect
      const datacubeId = savedURL.includes('/dataComparative/') ? undefined : _.first(contextInsight.context_id);

      if (savedURL !== currentURL) {
        // special case
        if (this.projectType === ProjectType.Analysis && this.selectedContextInsight.visibility === 'public') {
          // this is an insight created by the domain modeler during model publication:
          // for applying this insight, do not redirect to the domain project page,
          // instead use the current context and rehydrate the view
          savedURL = '/analysis/' + this.project + '/data/' + this.analysisId;
        }

        if (this.projectType === ProjectType.Model) {
          // this is an insight created by the domain modeler during model publication:
          //  needed since an existing url may have insight_id with old/invalid value
          savedURL = '/model/' + this.project + '/model-publishing-experiment';
        }

        // add 'insight_id' as a URL param so that the target page can apply it
        const finalURL = InsightUtil.getSourceUrlForExport(savedURL, this.selectedContextInsight.id, datacubeId);

        try {
          this.$router.push(finalURL);
        } catch (e) {
        }
      } else {
        router.push({
          query: {
            insight_id: this.selectedContextInsight.id,
            datacube_id: datacubeId
          }
        }).catch(() => {});
      }
    },
    isDisabled(insight) {
      return insight.visibility === 'public' && this.projectType === ProjectType.Analysis;
    },
    async deleteContextInsight(insight) {
      if (this.isDisabled(insight)) {
        return;
      }

      // are removing a public insight (from the context panel within a domain project)?
      if (insight.visibility === 'public' && Array.isArray(insight.context_id) && insight.context_id.length > 0) {
        // is this the last public insight for the relevant dataube?
        //  if so, unpublish the model datacube
        const datacubeId = insight.context_id[0];
        const publicInsightCount = await InsightUtil.countPublicInsights(datacubeId, this.project);
        if (publicInsightCount === 1) {
          await unpublishDatacube(datacubeId, this.project);
          this.setRefreshDatacubes(true);
        }
      }

      const id = insight.id;
      await InsightUtil.removeInsight(id);
      // refresh the latest list from the server
      this.reFetchInsights();
    },
    editContextInsight(insight) {
      if (this.isDisabled(insight)) {
        return;
      }
      this.showInsightPanel();
      this.setUpdatedInsight(insight);
      this.setInsightList(this.listContextInsights);
      this.setCurrentPane('review-edit-insight');
    }
  }
};
</script>

<style lang="scss">
@import "~styles/variables";

.list-context-insights-pane-container {
  color: #707070;
  overflow-y: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;

  .pane-content {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }
  .pane-footer {
    margin: 10px 0;
  }
  .context-insight {
    cursor: pointer;
    margin-bottom: 40px;

    &:first-child {
      margin-top: 20px;
    }

    .context-insight-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      .context-insight-title {
        flex: 1 1 auto;
        color: gray;
        font-style: italic;
        font-size: $font-size-large;
      }
      .private-insight-title {
        color: black;
        font-style: normal;
      }
    }
    .context-insight-content {
      .context-insight-thumbnail {
        width:  100%;
      }
      .context-insight-description {
        color: gray;
        font-style: italic;
      }
      .private-insight-description {
        color: black;
        font-style: normal;
      }
      .context-insight-empty-description {
        color: black;
        opacity: 0.4;
      }
    }
  }
  .selected {
    border: 3px solid $selected;
  }
}

.export-dropdown {
  margin-bottom: 10px;
}

.insight-button-disabled {
  cursor: none;
  color: lightgray;
}

</style>
