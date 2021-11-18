<template>
  <div class="new-insight-modal-container">
    <full-screen-modal-header
      icon="angle-left"
      nav-back-label="All Insights"
      @close="closeInsightReview"
    >
      <div v-if="updatedInsight !== null" class="header">
        <div class="control-buttons">
          <div style="display: flex; align-items: center">
            <button
              type="button"
              class="btn btn-primary header-button"
              v-tooltip="'Edit insight'"
              @click="editInsight"
              >
              <i class="fa fa-edit" />
            </button>
            <button
              type="button"
              class="btn btn-primary header-button"
              v-tooltip="'Toggle metadata'"
              @click="showMetadataPanel=!showMetadataPanel"
              >
              <i class="fa fa-info" />
            </button>
            <button
              type="button"
              class="btn btn-primary header-button"
              v-tooltip="'Jump to live context'"
              @click="selectInsight"
              >
              <i class="fa fa-level-up" />
            </button>
            <dropdown-button
              v-tooltip="'Export insight'"
              :inner-button-label="'Export'"
              :is-dropdown-left-aligned="true"
              :items="['Powerpoint', 'Word']"
              class="header-button-export"
              @item-selected="exportInsight"
            />
          </div>
          <button
            type="button"
            class="btn btn-primary header-button"
            style="backgroundColor: red; color: white"
            v-tooltip="'Delete insight'"
            @click="removeInsight"
            >
            <i class="fa fa-trash" />
          </button>
        </div>
      </div>
    </full-screen-modal-header>
    <div class="pane-wrapper">
      <div class="pane-row">
        <button
          :disabled="nextInsight === null"
          type="button"
          class="btn btn-primary nav-button col-md-2"
          v-tooltip="'Previous insight'"
          @click="goToNextInsight"
          >
          <i class="fa fa-chevron-left" />
        </button>
        <div class="content">
          <div class="fields">
            <div class="title">{{insightTitle}}</div>
            <div class="desc">{{insightDesc}}</div>
            <div class="image-preview-and-metadata">
              <div v-if="imagePreview !== null" class="preview">
                <img :src="imagePreview">
              </div>
              <disclaimer
                v-else
                style="text-align: center; color: black"
                :message="updatedInsight === null ? 'No more insights available to preview!' : 'No image preview!'"
              />
              <drilldown-panel
                v-if="showMetadataPanel"
                is-open
                :tabs="drilldownTabs"
                :activeTabId="drilldownTabs[0].id"
                only-display-icons
              >
                <template #content>
                  <div>
                    <ul>
                      <li
                        v-for="metadataAttr in metadataDetails"
                        :key="metadataAttr.key">
                        <b>{{metadataAttr.key}}</b> {{ metadataAttr.value }}
                      </li>
                    </ul>
                  </div>
                </template>
              </drilldown-panel>
            </div>
          </div>
        </div>

        <button
          :disabled="prevInsight === null"
          type="button"
          class="btn btn-primary nav-button col-md-2"
          v-tooltip="'Next insight'"
          @click="goToPreviousInsight"
          >
          <i class="fa fa-chevron-right" />
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent
} from 'vue';
import Disclaimer from '@/components/widgets/disclaimer.vue';
import FullScreenModalHeader from '@/components/widgets/full-screen-modal-header.vue';
import { mapActions, mapGetters, useStore } from 'vuex';
import InsightUtil, { MetadataSummary } from '@/utils/insight-util';
import { Insight } from '@/types/Insight';
import router from '@/router';
import DropdownButton from '@/components/dropdown-button.vue';
import DrilldownPanel from '@/components/drilldown-panel.vue';

const METDATA_DRILLDOWN_TABS = [
  {
    name: 'Metadata',
    id: 'metadata',
    icon: 'fa-info-circle'
  }
];

// use the review-insight view as one common view for previewing, editing, and creating new insights

export default defineComponent({
  name: 'ReviewInsightModal',
  components: {
    FullScreenModalHeader,
    Disclaimer,
    DropdownButton,
    DrilldownPanel
  },
  props: {
  },
  emits: ['cancel', 'delete-insight'],
  setup() {
    const store = useStore();
    return {
      store
    };
  },
  data: () => ({
    drilldownTabs: METDATA_DRILLDOWN_TABS,
    showMetadataPanel: true
  }),
  computed: {
    ...mapGetters({
      currentView: 'app/currentView',
      projectMetadata: 'app/projectMetadata',
      currentPane: 'insightPanel/currentPane',
      isPanelOpen: 'insightPanel/isPanelOpen',
      updatedInsight: 'insightPanel/updatedInsight',
      insightList: 'insightPanel/insightList',
      filters: 'dataSearch/filters'
    }),
    imagePreview(): string | null {
      if (this.updatedInsight) {
        return this.updatedInsight.thumbnail;
      }
      return null;
    },
    nextInsight(): Insight | null {
      if (this.updatedInsight) {
        // start with the index of the current insight
        const indx = this.insightList.findIndex((ins: Insight) => ins.id === this.updatedInsight.id);
        if (indx + 1 < this.insightList.length) {
          return this.insightList[indx + 1];
        }
      }
      return null;
    },
    prevInsight(): Insight | null {
      if (this.updatedInsight) {
        // start with the index of the current insight
        const indx = this.insightList.findIndex((ins: Insight) => ins.id === this.updatedInsight.id);
        if (indx - 1 >= 0) {
          return this.insightList[indx - 1];
        }
      }
      return null;
    },
    insightTitle(): string {
      return this.updatedInsight && this.updatedInsight.name.length > 0 ? this.updatedInsight.name : '<Insight title missing...>';
    },
    insightDesc(): string {
      return this.updatedInsight && this.updatedInsight.description.length > 0 ? this.updatedInsight.description : '<Insight description missing...>';
    },
    formattedFilterString(): string {
      return InsightUtil.getFormattedFilterString(this.filters);
    },
    metadataDetails(): MetadataSummary[] {
      return InsightUtil.parseMetadataDetails(this.updatedInsight.data_state, this.projectMetadata, this.formattedFilterString, this.currentView);
    }
  },
  methods: {
    ...mapActions({
      setCurrentPane: 'insightPanel/setCurrentPane',
      showInsightPanel: 'insightPanel/showInsightPanel',
      setUpdatedInsight: 'insightPanel/setUpdatedInsight',
      setInsightList: 'insightPanel/setInsightList',
      hideInsightPanel: 'insightPanel/hideInsightPanel'
    }),
    closeInsightReview() {
      this.showInsightPanel();
      this.setCurrentPane('list-insights');
    },
    removeInsight() {
      // before deletion, find the index of the insight to be removed
      const indx = this.insightList.findIndex((ins: Insight) => ins.id === this.updatedInsight.id);

      // remove the insight from the server
      InsightUtil.removeInsight(this.updatedInsight.id, this.store);

      // remove this insight from the local insight list
      const filteredInsightList: Insight[] = this.insightList.filter((ins: Insight) => ins.id !== this.updatedInsight.id);
      this.setInsightList(filteredInsightList);

      // switch to the next/prev insight and update the 'updatedInsight'
      //  if no more insights, exit this gallery view
      if (filteredInsightList.length === 0) {
        this.setUpdatedInsight(null);
      } else {
        const updatedIndx = Math.min(indx, filteredInsightList.length - 1);
        this.setUpdatedInsight(filteredInsightList[updatedIndx]);
      }
    },
    goToPreviousInsight() {
      this.setUpdatedInsight(this.prevInsight);
    },
    goToNextInsight() {
      this.setUpdatedInsight(this.nextInsight);
    },
    editInsight() {
      this.setCurrentPane('edit-insight');
    },
    selectInsight() {
      const insight = this.updatedInsight;
      const currentURL = this.$route.fullPath;
      const finalURL = InsightUtil.jumpToInsightContext(insight, currentURL);
      if (finalURL) {
        this.$router.push(finalURL);
      } else {
        router.push({
          query: {
            insight_id: insight.id
          }
        }).catch(() => {});
      }
      this.hideInsightPanel();
    },
    exportInsight(item: string) {
      switch (item) {
        case 'Word':
          InsightUtil.exportDOCX([this.updatedInsight], this.projectMetadata);
          break;
        case 'Powerpoint':
          InsightUtil.exportPPTX([this.updatedInsight], this.projectMetadata);
          break;
        default:
          break;
      }
    }
  }
});
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.header-button {
  margin-right: 4px;
  background-color: royalblue;
  padding: 3px 6px;
  font-size: larger;
  min-width: 30px;
  &:hover {
    background-color: dodgerblue;
  }
}

.header-button-export {
  ::v-deep(.dropdown-btn) {
    padding-bottom: 10px;
    margin-right: 4px;
    background-color: royalblue;
    padding: 3px 6px;
    font-size: larger;
    &:hover {
      background-color: dodgerblue;
    }
  }
  ::v-deep(.dropdown-control) {
    top: 100%;
  }
}

.nav-button {
  height: fit-content;
  margin: 1rem;
  width: auto;
}

.header {
  display: flex;
  justify-content: flex-end;
  width: 100%;

  .control-buttons {
    width: 50%;
    display: flex;
    justify-content: space-around;
  }
}

.new-insight-modal-container {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  justify-content: center;
  align-content: stretch;
  align-items: stretch;
  height: 100vh;
  overflow: hidden;

  .pane-wrapper {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
    overflow-y: hidden;
    padding: 1em 0 0;
    .pane-row {
      flex: 1 1 auto;
      display: flex;
      flex-direction: row;
      height: 100%;
      align-items: center;
      .content {
        justify-content: center;
        display: flex;
        height: 100%;
        width: 100%;
        .fields {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding-left: 1rem;
          padding-right: 1rem;
          padding-bottom: 1rem;
          height: 100%;
          .title {
            font-size: xx-large;
            color: black;
            align-self: flex-start;
            font-weight: bold;
          }
          .desc {
            font-size: large;
            color: darkgray;
            align-self: flex-start;
            font-style: italic;
          }
          .image-preview-and-metadata {
            display: flex;
            overflow: auto;
            height: 100%;
            .preview {
              overflow: auto;
              align-self: flex-start;
              height: 100%;
              width: 100%;
              img {
                max-height: 100%;
                max-width: 100%;
                height: 100%;
                width: 100%;
              }
            }
          }
        }
      }
    }
  }
}

.error-msg {
  color: $negative;
}

h6 {
  @include header-secondary;
  font-size: $font-size-medium;
}

</style>

