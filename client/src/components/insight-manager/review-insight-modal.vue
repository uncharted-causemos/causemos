<template>
  <div class="new-insight-modal-container">
    <full-screen-modal-header
      icon="angle-left"
      :nav-back-label="newMode ? 'Close' : 'All Insights'"
      @close="closeInsightReview"
    >
      <div class="header">
        <div class="control-buttons">
          <div style="display: flex; align-items: center">
            <button
              v-if="updatedInsight !== null && !isEditingInsight"
              type="button"
              class="btn btn-primary header-button"
              v-tooltip="'Edit insight'"
              @click="editInsight"
              >
              <i class="fa fa-edit" />
            </button>
            <div v-else class="insight-edit-controls">
              <button
                type="button"
                class="btn btn-primary header-button"
                v-tooltip="'Cancel editing!'"
                @click="cancelInsightEdit"
              >
                Cancel
              </button>
              <button
                :disabled="hasError"
                type="button"
                class="btn btn-primary header-button"
                v-tooltip="'Save insight'"
                @click="confirmInsightEdit"
              >
                Done
              </button>
            </div>
            <button
              v-if="updatedInsight !== null"
              type="button"
              class="btn btn-primary header-button"
              v-tooltip="'Toggle metadata'"
              @click="showMetadataPanel=!showMetadataPanel"
              >
              <i class="fa fa-info" />
            </button>
            <button
              v-if="updatedInsight !== null"
              type="button"
              class="btn btn-primary header-button"
              v-tooltip="'Jump to live context'"
              @click="selectInsight"
              >
              <i class="fa fa-level-up" />
            </button>
            <dropdown-button
              v-if="updatedInsight !== null"
              v-tooltip="'Export insight'"
              :inner-button-label="'Export'"
              :is-dropdown-left-aligned="true"
              :items="['Powerpoint', 'Word']"
              class="header-button-export"
              @item-selected="exportInsight"
            />
          </div>
          <button
            v-if="updatedInsight !== null"
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
            <div v-if="!isEditingInsight" class="title">{{previewInsightTitle}}</div>
            <input
              v-else
              v-model="insightTitle"
              v-focus
              type="text"
              class="form-control"
              placeholder="Untitled insight name"
            />
            <div
              v-if="isEditingInsight && hasError"
              class="error-msg">
              {{ errorMsg }}
            </div>
            <div v-if="!isEditingInsight" class="desc">{{previewInsightDesc}}</div>
            <textarea
              v-else
              v-model="insightDesc"
              rows="2"
              class="form-control"
              placeholder="Untitled insight description" />
            <div class="image-preview-and-metadata">
              <div v-if="imagePreview !== null || newImagePreview !== null" class="preview">
                <img v-if="newImagePreview !== null" :src="newImagePreview">
                <img v-if="imagePreview !== null" :src="imagePreview">
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
import { addInsight, updateInsight } from '@/services/insight-service';
import { INSIGHTS } from '@/utils/messages-util';
import useToaster from '@/services/composables/useToaster';
import html2canvas from 'html2canvas';
import _ from 'lodash';
import { ProjectType } from '@/types/Enums';

const MSG_EMPTY_INSIGHT_NAME = 'Insight name cannot be blank';

const METDATA_DRILLDOWN_TABS = [
  {
    name: 'Metadata',
    id: 'metadata',
    icon: 'fa-info-circle'
  }
];

export default defineComponent({
  name: 'ReviewInsightModal',
  components: {
    FullScreenModalHeader,
    Disclaimer,
    DropdownButton,
    DrilldownPanel
  },
  props: {
    editMode: {
      type: Boolean,
      default: false
    },
    newMode: {
      type: Boolean,
      default: false
    }
  },
  emits: ['cancel', 'delete-insight'],
  setup() {
    const store = useStore();
    const toaster = useToaster();
    return {
      toaster,
      store
    };
  },
  data: () => ({
    errorMsg: MSG_EMPTY_INSIGHT_NAME,
    drilldownTabs: METDATA_DRILLDOWN_TABS,
    showMetadataPanel: true,
    isEditingInsight: false,
    insightTitle: '',
    insightDesc: '',
    newImagePreview: null as string | null,
    hasError: false // true when insight name is invalid
  }),
  watch: {
    insightTitle: {
      handler(n) {
        if (n.length === 0) {
          this.hasError = true;
        } else {
          this.hasError = false;
        }
      },
      immediate: true
    },
    editMode: {
      handler(/* newValue, oldValue */) {
        if (this.updatedInsight && this.editMode) {
          this.editInsight();
        }
      },
      immediate: true
    },
    newMode: {
      handler(/* newValue, oldValue */) {
        // clear insight fields: name/desc
        // capture the image
      },
      immediate: true
    }
  },
  computed: {
    ...mapGetters({
      project: 'app/project',
      projectType: 'app/projectType',
      currentView: 'app/currentView',
      dataState: 'insightPanel/dataState',
      viewState: 'insightPanel/viewState',
      contextId: 'insightPanel/contextId',
      projectMetadata: 'app/projectMetadata',
      currentPane: 'insightPanel/currentPane',
      isPanelOpen: 'insightPanel/isPanelOpen',
      updatedInsight: 'insightPanel/updatedInsight',
      insightList: 'insightPanel/insightList',
      countInsights: 'insightPanel/countInsights',
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
    formattedFilterString(): string {
      return InsightUtil.getFormattedFilterString(this.filters);
    },
    metadataDetails(): MetadataSummary[] {
      const dState = this.newMode ? this.dataState : this.updatedInsight.data_state;
      return InsightUtil.parseMetadataDetails(dState, this.projectMetadata, this.formattedFilterString, this.currentView);
    },
    previewInsightTitle(): string {
      return this.updatedInsight && this.updatedInsight.name.length > 0 ? this.updatedInsight.name : '<Insight title missing...>';
    },
    previewInsightDesc(): string {
      return this.updatedInsight && this.updatedInsight.description.length > 0 ? this.updatedInsight.description : '<Insight description missing...>';
    },
    insightVisibility(): string {
      return this.projectType === ProjectType.Analysis ? 'private' : 'public';
      // return (this.currentView === 'modelPublishingExperiment' || this.currentView === 'dataPreview') ? 'public' : 'private';
    },
    insightTargetView(): string[] {
      // an insight created during model publication should be listed either
      //  in the full list of insights,
      //  or as a context specific insight when opening the page of the corresponding model family instance
      //  (the latter is currently supported via a special route named dataPreview)
      // return this.currentView === 'modelPublishingExperiment' ? ['data', 'dataPreview', 'domainDatacubeOverview', 'overview', 'modelPublishingExperiment'] : [this.currentView, 'overview'];
      return this.projectType === ProjectType.Analysis ? [this.currentView, 'overview', 'dataComparative'] : ['data', 'nodeDrilldown', 'dataComparative', 'overview', 'dataPreview', 'domainDatacubeOverview', 'modelPublishingExperiment'];
    }
  },
  async mounted() {
    if (this.newMode) {
      this.newImagePreview = await this.takeSnapshot();
      this.editInsight();
    }
  },
  methods: {
    ...mapActions({
      setCurrentPane: 'insightPanel/setCurrentPane',
      showInsightPanel: 'insightPanel/showInsightPanel',
      setUpdatedInsight: 'insightPanel/setUpdatedInsight',
      setInsightList: 'insightPanel/setInsightList',
      hideInsightPanel: 'insightPanel/hideInsightPanel',
      setCountInsights: 'insightPanel/setCountInsights',
      hideContextInsightPanel: 'contextInsightPanel/hideContextInsightPanel',
      setCurrentContextInsightPane: 'contextInsightPanel/setCurrentPane',
      setRefetchInsights: 'contextInsightPanel/setRefetchInsights'
    }),
    async takeSnapshot() {
      const el = document.getElementsByClassName('insight-capture')[0] as HTMLElement;
      const image = _.isNil(el) ? null : (await html2canvas(el, { scale: 1 })).toDataURL();
      return image;
    },
    closeInsightReview() {
      if (this.newMode) {
        this.hideInsightPanel();
        this.setCurrentPane('');
      } else {
        this.cancelInsightEdit();
        this.showInsightPanel();
        this.setCurrentPane('list-insights');
      }
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
      if (this.isEditingInsight) {
        this.cancelInsightEdit();
      }
      this.setUpdatedInsight(this.prevInsight);
    },
    goToNextInsight() {
      if (this.isEditingInsight) {
        this.cancelInsightEdit();
      }
      this.setUpdatedInsight(this.nextInsight);
    },
    editInsight() {
      this.isEditingInsight = true;
      // save current insight name/desc in case the user cancels the edit action
      this.insightTitle = this.newMode ? '' : this.updatedInsight.name;
      this.insightDesc = this.newMode ? '' : this.updatedInsight.description;
    },
    cancelInsightEdit() {
      this.isEditingInsight = false;
      if (this.newMode) {
        this.closeInsightReview();
      }
    },
    confirmInsightEdit() {
      this.isEditingInsight = false;
      // save the updated insight in the backend
      this.saveInsight();
    },
    getAnnotatedState(eventData: any) {
      return !eventData ? undefined : {
        markerAreaState: eventData.markerAreaState,
        cropAreaState: eventData.cropState,
        imagePreview: eventData.croppedNonAnnotatedImagePreview
      };
    },
    closeContextInsightPanel() {
      this.hideContextInsightPanel();
      this.setCurrentContextInsightPane('');
    },
    saveInsight() {
      if (this.hasError || this.insightTitle.trim().length === 0) return;

      if (this.newMode) {
        // saving a new insight
        const url = this.$route.fullPath;
        const newInsight: Insight = {
          name: this.insightTitle,
          description: this.insightDesc,
          visibility: this.insightVisibility,
          project_id: this.project,
          context_id: this.contextId,
          url,
          target_view: this.insightTargetView,
          pre_actions: null,
          post_actions: null,
          is_default: true,
          analytical_question: [],
          thumbnail: this.newImagePreview as string,
          annotation_state: undefined, // this.getAnnotatedState(eventData),
          view_state: this.viewState,
          data_state: this.dataState
        };
        addInsight(newInsight)
          .then((result) => {
            const message = result.status === 200 ? INSIGHTS.SUCCESSFUL_ADDITION : INSIGHTS.ERRONEOUS_ADDITION;
            if (message === INSIGHTS.SUCCESSFUL_ADDITION) {
              this.toaster(message, 'success', false);
              const count = this.countInsights + 1;
              this.setCountInsights(count);
            } else {
              this.toaster(message, 'error', true);
            }
            this.closeInsightReview();
            this.closeContextInsightPanel();
            this.setRefetchInsights(true);
          });
        // just in case the call to the server fails
        this.closeInsightReview();
        this.closeContextInsightPanel();
      } else {
        // saving an existing insight
        if (!this.updatedInsight) {
          const updatedInsight = this.updatedInsight;
          updatedInsight.name = this.insightTitle;
          updatedInsight.description = this.insightDesc;
          // updatedInsight.thumbnail = eventData ? eventData.annotatedImagePreview : updatedInsight.thumbnail;
          // updatedInsight.annotation_state = this.getAnnotatedState(eventData);
          updateInsight(this.updatedInsight.id, updatedInsight)
            .then((result) => {
              if (result.updated === 'success') {
                this.toaster(INSIGHTS.SUCCESFUL_UPDATE, 'success', false);
              } else {
                this.toaster(INSIGHTS.ERRONEOUS_UPDATE, 'error', true);
              }
            });
        }
      }
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

.insight-edit-controls {
  padding-right: 2rem;
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
            padding-top: 5px;
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

