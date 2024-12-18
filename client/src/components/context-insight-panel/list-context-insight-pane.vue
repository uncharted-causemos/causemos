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
      class="btn btn-call-to-action"
      @click.stop="newInsight"
    >
      <i class="fa fa-fw fa-star fa-lg" />
      New Insight
    </button>
    <div v-if="listContextInsights.length > 0" class="pane-content">
      <div
        v-for="contextInsight in listContextInsights"
        :key="contextInsight.id"
        class="context-insight"
        :class="{
          selected: selectedContextInsight === contextInsight,
          '': selectedContextInsight !== contextInsight,
        }"
        @click="selectContextInsight(contextInsight)"
      >
        <div class="context-insight-header">
          <div class="context-insight-title private-insight-title">
            {{ contextInsight.name }}
          </div>
          <options-button :dropdown-below="true">
            <template #content>
              <div class="dropdown-option" @click="editContextInsight(contextInsight)">
                <i class="fa fa-edit" />
                Edit
              </div>
              <div class="dropdown-option" @click="deleteContextInsight(contextInsight)">
                <i class="fa fa-trash" />
                Delete
              </div>
            </template>
          </options-button>
        </div>
        <div class="context-insight-content">
          <img-lazy
            :src="`/api/insights/${contextInsight.id}/thumbnail`"
            class="context-insight-thumbnail"
          />
          <div
            v-if="contextInsight.description?.length ?? 0 > 0"
            class="context-insight-description private-insight-description"
          >
            {{ contextInsight.description }}
          </div>
          <span v-else class="context-insight-empty-description">No description. </span>
        </div>
      </div>
    </div>
    <message-display v-else :message="MESSAGE_NO_DATA" />
    <button type="button" class="btn pane-footer" @click="openInsightsExplorer">
      <i class="fa fa-fw fa-star fa-lg" />
      Review All Insights
    </button>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { mapGetters, mapActions } from 'vuex';
import DropdownButton from '@/components/dropdown-button.vue';
import ImgLazy from '@/components/widgets/img-lazy.vue';

import { INSIGHTS } from '@/utils/messages-util';
import InsightUtil from '@/utils/insight-util';

import useInsightsData from '@/composables/useInsightsData';
import { fetchFullInsights, removeInsight } from '@/services/insight-service';
import MessageDisplay from '@/components/widgets/message-display.vue';
import OptionsButton from '@/components/widgets/options-button.vue';
import { getBibiographyFromCagIds } from '@/services/bibliography-service';
import useInsightStore from '@/composables/useInsightStore';
import { Insight, NewInsight } from '@/types/Insight';

export default {
  name: 'ListContextInsightPane',
  components: {
    DropdownButton,
    MessageDisplay,
    OptionsButton,
    ImgLazy,
  },
  props: {
    allowNewInsights: {
      type: Boolean,
      default: true,
    },
  },
  data: () => ({
    MESSAGE_NO_DATA: INSIGHTS.NO_DATA,
    selectedContextInsight: null as Insight | NewInsight | null,
  }),
  setup() {
    const { insights: listContextInsights, reFetchInsights } = useInsightsData(undefined, true);

    const {
      showInsightPanel,
      setCurrentPane,
      setUpdatedInsight,
      setInsightsBySection,
      setPositionInReview,
      setRefreshDatacubes,
      setSnapshotUrl,
    } = useInsightStore();

    return {
      listContextInsights,
      reFetchInsights,

      showInsightPanel,
      setCurrentPane,
      setUpdatedInsight,
      setInsightsBySection,
      setPositionInReview,
      setRefreshDatacubes,
      setSnapshotUrl,

      instanceOfNewInsight: InsightUtil.instanceOfNewInsight,
    };
  },
  computed: {
    ...mapGetters({
      projectMetadata: 'app/projectMetadata',
      projectType: 'app/projectType',
      project: 'app/project',
    }),
  },
  methods: {
    ...mapActions({
      enableOverlay: 'app/enableOverlay',
      disableOverlay: 'app/disableOverlay',
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
    async exportContextInsight(item: 'Word' | 'Powerpoint') {
      this.enableOverlay('Preparing to export insights');
      const bibliographyMap = await getBibiographyFromCagIds([]);
      const insights = await fetchFullInsights({
        id: this.listContextInsights.map((d) => d.id as string),
      });
      this.disableOverlay();

      switch (item) {
        case 'Word':
          InsightUtil.exportDOCX(insights, this.projectMetadata, undefined, bibliographyMap);
          break;
        case 'Powerpoint':
          InsightUtil.exportPPTX(insights, this.projectMetadata);
          break;
        default:
          break;
      }
    },
    selectContextInsight(contextInsight: Insight | NewInsight) {
      if (contextInsight === this.selectedContextInsight) {
        this.selectedContextInsight = null;
        return;
      }
      this.selectedContextInsight = contextInsight;

      const currentURL = this.$route.fullPath;

      const finalURL = InsightUtil.jumpToInsightContext(
        this.selectedContextInsight,
        currentURL,
        this.project,
        this.projectType
      );

      if (finalURL) {
        try {
          this.$router.push(finalURL);
        } catch (e) {}
      } else {
        // NOTE: applying an insight should not automatically set a specific datacube_id as a query param
        //  because, for example, the comparative analysis (region-ranking) page does not
        //  need/understand a specific datacube_id,
        //  and setting it regardless may have a negative side effect
        const datacubeId =
          InsightUtil.instanceOfNewInsight(contextInsight) ||
          contextInsight.url.includes('/dataComparative/')
            ? undefined
            : _.first(contextInsight.context_id);
        this.$router
          .push({
            query: {
              insight_id: this.selectedContextInsight.id,
              datacube_id: datacubeId,
            },
          })
          .catch(() => {});
      }
    },
    async deleteContextInsight(insight: Insight | NewInsight) {
      await removeInsight(insight.id as string);
      // refresh the latest list from the server
      this.reFetchInsights();
    },
    editContextInsight(insight: Insight | NewInsight) {
      this.showInsightPanel();
      this.setUpdatedInsight(insight);
      const dummySection = InsightUtil.createEmptyChecklistSection();
      const insightsBySection = [
        {
          section: dummySection,
          insights: this.listContextInsights,
        },
      ];
      this.setInsightsBySection(insightsBySection);
      this.setPositionInReview({
        sectionId: dummySection.id as string,
        insightId: insight.id as string,
      });
      this.setCurrentPane('review-edit-insight');
    },
  },
};
</script>

<style lang="scss">
@import '~styles/variables';

.list-context-insights-pane-container {
  color: #707070;
  overflow-y: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;

  .pane-content {
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
        width: 100%;
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
</style>
