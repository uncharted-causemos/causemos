<template>
  <div class="list-context-insights-pane-container">
    <modal-confirmation
      v-if="showModal"
      :autofocus-confirm="false"
      @confirm="redirectToAnalysisInsight"
      @close="showModal = false"
    >
      <template #title>Applying Analysis Insight</template>
      <template #message>
        <p>Are you sure you want to redirect to the relevant analysis project and apply the insight?</p>
        <message-display
          :message="'Warning: This action will take you out of the current flow.'"
          :message-type="'alert-warning'"
        />
      </template>
    </modal-confirmation>
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
      class="row btn btn-primary btn-call-for-action"
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
                @click="editContextInsight(contextInsight)"
              >
                <i class="fa fa-edit" />
                Edit
              </div>
              <div
                class="dropdown-option"
                @click="deleteContextInsight(contextInsight.id)"
              >
                <i class="fa fa-trash" />
                Delete
              </div>
            </template>
          </options-button>
        </div>
        <div class="context-insight-content">
          <img
            :src="contextInsight.thumbnail"
            class="context-insight-thumbnail"
          >
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

import pptxgen from 'pptxgenjs';
import { Packer, Document, SectionType, Footer, Paragraph, AlignmentType, ImageRun, TextRun, HeadingLevel, ExternalHyperlink, UnderlineType } from 'docx';
import { saveAs } from 'file-saver';
import { mapGetters, mapActions } from 'vuex';
import DropdownButton from '@/components/dropdown-button.vue';

import { INSIGHTS } from '@/utils/messages-util';
import InsightUtil from '@/utils/insight-util';

import dateFormatter from '@/formatters/date-formatter';
import stringFormatter from '@/formatters/string-formatter';

import router from '@/router';
import { deleteInsight } from '@/services/insight-service';
import useInsightsData from '@/services/composables/useInsightsData';
import { ProjectType } from '@/types/Enums';
import ModalConfirmation from '@/components/modals/modal-confirmation.vue';
import MessageDisplay from '@/components/widgets/message-display';
import OptionsButton from '@/components/widgets/options-button.vue';

export default {
  name: 'ListContextInsightPane',
  components: {
    DropdownButton,
    MessageDisplay,
    ModalConfirmation,
    OptionsButton
  },
  props: {
    allowNewInsights: {
      type: Boolean,
      default: true
    }
  },
  data: () => ({
    exportActive: false,
    messageNoData: INSIGHTS.NO_DATA,
    selectedContextInsight: null,
    showModal: false,
    redirectInsightUrl: ''
  }),
  setup() {
    const { insights: listContextInsights, reFetchInsights } = useInsightsData();
    return {
      listContextInsights,
      reFetchInsights
    };
  },
  computed: {
    ...mapGetters({
      projectMetadata: 'app/projectMetadata',
      countContextInsights: 'contextInsightPanel/countContextInsights',
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
  mounted() {
    this.showContextInsightPanel();
  },
  methods: {
    ...mapActions({
      showContextInsightPanel: 'contextInsightPanel/showContextInsightPanel',
      showInsightPanel: 'insightPanel/showInsightPanel',
      setCurrentPane: 'insightPanel/setCurrentPane',
      setUpdatedInsight: 'insightPanel/setUpdatedInsight'
    }),
    stringFormatter,
    redirectToAnalysisInsight() {
      if (this.redirectInsightUrl !== '') {
        this.$router.push(this.redirectInsightUrl);
      }
      this.showModal = false;
      this.redirectInsightUrl = '';
    },
    newInsight() {
      this.showInsightPanel();
      this.setCurrentPane('new-insight');
    },
    openInsightsExplorer() {
      this.showInsightPanel();
      this.setCurrentPane('list-insights');
    },
    exportContextInsight(item) {
      switch (item) {
        case 'Word':
          this.exportDOCX();
          break;
        case 'Powerpoint':
          this.exportPPTX();
          break;
        default:
          break;
      }
    },
    toggleExportMenu() {
      this.exportActive = !this.exportActive;
    },
    selectContextInsight(contextInsight) {
      if (contextInsight === this.selectedContextInsight) {
        this.selectedContextInsight = null;
        return;
      }
      this.selectedContextInsight = contextInsight;

      let savedURL = this.selectedContextInsight.url;
      const currentURL = this.$route.fullPath;
      const datacubeId = _.first(contextInsight.context_id);
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
        const finalURL = savedURL.includes('/data/')
          ? InsightUtil.getSourceUrlForExport(savedURL, this.selectedContextInsight.id, _.first(this.selectedContextInsight.context_id))
          : InsightUtil.getSourceUrlForExport(savedURL, this.selectedContextInsight.id);

        // special case
        if (this.projectType !== ProjectType.Analysis && this.selectedContextInsight.visibility === 'private') {
          // this is a private insight created by an analyst:
          // when applying this insight from within a domain project, it will redirect to the relevant analysis project
          // so show a warning before leaving
          this.redirectInsightUrl = finalURL;
          this.showWarningModal();
          return;
        }

        this.$router.push(finalURL);
      } else {
        router.push({
          query: {
            insight_id: this.selectedContextInsight.id,
            datacube_id: datacubeId
          }
        }).catch(() => {});
      }
    },
    showWarningModal() {
      this.showModal = true;
    },
    deleteContextInsight(id) {
      deleteInsight(id).then(result => {
        const message = result.status === 200 ? INSIGHTS.SUCCESSFUL_REMOVAL : INSIGHTS.ERRONEOUS_REMOVAL;
        if (message === INSIGHTS.SUCCESSFUL_REMOVAL) {
          this.toaster(message, 'success', false);
          // refresh the latest list from the server
          this.reFetchInsights();
        } else {
          this.toaster(message, 'error', true);
        }
      });
    },
    editContextInsight(insight) {
      this.showInsightPanel();
      this.setUpdatedInsight(insight);
      this.setCurrentPane('edit-insight');
    },
    openExport() {
      this.exportActive = true;
    },
    getFileName() {
      const date = new Date();
      const formattedDate = dateFormatter(date, 'YYYY-MM-DD hh:mm:ss a');
      return `Causemos ${this.projectMetadata.name} ${formattedDate}`;
    },
    slideURL(slideURL) {
      return `${window.location.protocol}//${window.location.host}/#${slideURL}`;
    },
    exportDOCX() {
      // 72dpi * 8.5 inches width, as word perplexing uses pixels
      // same height as width so that we can attempt to be consistent with the layout.
      const docxMaxImageSize = 612;

      const sections = this.listContextInsights.map((bm) => {
        const datacubeId = _.first(bm.context_id);
        const imageSize = this.scaleImage(bm.thumbnail, docxMaxImageSize, docxMaxImageSize);
        const insightDate = dateFormatter(bm.modified_at);
        return {
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      size: 16,
                      text: this.metadataSummary
                    })
                  ]
                })
              ]
            })
          },
          properties: {
            type: SectionType.NEXT_PAGE
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              heading: HeadingLevel.HEADING_2,
              text: `${bm.title}`
            }),
            new Paragraph({
              break: 1,
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  data: bm.thumbnail,
                  transformation: {
                    height: imageSize.height,
                    width: imageSize.width
                  }
                })
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new TextRun({
                  break: 1,
                  bold: true,
                  size: 24,
                  text: 'Description: '
                }),
                new TextRun({
                  size: 24,
                  text: `${bm.description}`
                }),
                new TextRun({
                  bold: true,
                  break: 1,
                  size: 24,
                  text: 'Metadata: '
                }),
                new TextRun({
                  size: 24,
                  text: `Captured on: ${insightDate} - ${this.metadataSummary} - `
                }),
                new ExternalHyperlink({
                  child: new TextRun({
                    size: 24,
                    text: '(View Source on Causemos)',
                    underline: {
                      type: UnderlineType.SINGLE
                    }
                  }),
                  link: this.slideURL(InsightUtil.getSourceUrlForExport(bm.url, bm.id, datacubeId))
                })
              ]
            })
          ]
        };
      });

      const doc = new Document({
        sections,
        title: this.projectMetadata.name,
        description: this.metadataSummary
      });

      Packer.toBlob(doc).then(blob => {
        saveAs(blob, `${this.getFileName()}.docx`);
      });
      this.exportActive = false;
    },
    exportPPTX() {
      // some PPTX consts as powerpoint does everything in inches & has hard boundaries
      const widthLimitImage = 10;
      const heightLimitImage = 4.75;
      const Pptxgen = pptxgen;
      const pres = new Pptxgen();

      // so we can add the project metadata in the footer with basic numbering while we're at it.
      pres.defineSlideMaster({
        title: 'MASTER_SLIDE',
        margin: [0.5, 0.25, 1.00, 0.25],
        background: { fill: 'FFFFFF' },
        slideNumber: { x: 9.75, y: 5.375, color: '000000', fontSize: 8, align: pres.AlignH.right }
      });

      this.listContextInsights.forEach((bm) => {
        const datacubeId = _.first(bm.context_id);
        const imageSize = this.scaleImage(bm.thumbnail, widthLimitImage, heightLimitImage);
        const insightDate = dateFormatter(bm.modified_at);
        const slide = pres.addSlide();
        const notes = `Title: ${bm.title}\nDescription: ${bm.description}\nCaptured on: ${insightDate}\n${this.metadataSummary}`;

        /*
          PPTXGEN BUG WORKAROUND - library level function slide.addNotes(notes) doesn't insert notes
          correctly at the moment, placing an object array doesn't get parse back out to a string
          so we manually push a SlideObject representing a note in this slides' _slideObject array,
          so that only a string is set.
        */
        slide._slideObjects.push({
          _type: 'notes',
          text: notes
        });

        slide.addImage({
          data: bm.thumbnail,
          // centering image code for x & y limited by consts for max content size
          // plus base offsets needed to stay clear of other elements
          x: (widthLimitImage - imageSize.width) / 2,
          y: (heightLimitImage - imageSize.height) / 2,
          w: imageSize.width,
          h: imageSize.height
        });
        slide.addText([
          {
            text: `${bm.title}: `,
            options: {
              bold: true,
              hyperlink: {
                url: this.slideURL(InsightUtil.getSourceUrlForExport(bm.url, bm.id, datacubeId))
              }
            }
          },
          {
            text: `${bm.description} `,
            options: {
              break: false
            }
          },
          {
            text: `\n(Captured on: ${insightDate} - ${this.metadataSummary})`,
            options: {
              break: false
            }
          }
        ], {
          x: 0,
          y: 4.75,
          w: 10,
          h: 0.75,
          color: '363636',
          fontSize: 10,
          align: pres.AlignH.left
        });
      });
      pres.writeFile({
        fileName: this.getFileName()
      });
      this.exportActive = false;
    },
    getPngDimensionsInPixels(base64png) {
      const header = atob(base64png.slice(22, 72)).slice(16, 24);
      const uint8 = Uint8Array.from(header, c => c.charCodeAt(0));
      const dataView = new DataView(uint8.buffer);
      const width = dataView.getInt32(0);
      const height = dataView.getInt32(4);
      return { height, width };
    },
    scaleImage(base64png, widthLimit, heightLimit) {
      const imageSize = this.getPngDimensionsInPixels(base64png);
      let scaledWidth = widthLimit;
      let scaledHeight = imageSize.height * scaledWidth / imageSize.width;

      if (scaledHeight > heightLimit) {
        scaledHeight = heightLimit;
        scaledWidth = imageSize.width * scaledHeight / imageSize.height;
      }

      return {
        width: scaledWidth,
        height: scaledHeight
      };
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
        min-height: 100px;
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
