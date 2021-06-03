<template>
  <div class="list-insights-pane-container">
    <div class="pane-header">
      <h6>Saved Insights</h6>
      <button
        type="button"
        class="btn btn-primary"
        @click="toggleExportMenu"
      >
        <span class="lbl">Export</span>
        <i
          class="fa fa-fw"
          :class="{ 'fa-angle-down': !exportActive, 'fa-angle-up': exportActive }"
        />
      </button>
      <dropdown-control v-if="exportActive" class="below">
        <template #content>
          <div
            class="dropdown-option"
            @click="exportPPTX"
          >
            Powerpoint
          </div>
          <div
            class="dropdown-option"
            @click="exportDOCX"
          >
            Word
          </div>
        </template>
      </dropdown-control>
    </div>
    <div
      v-if="listInsights.length > 0"
      class="pane-content">
    <Insight-Card
      v-for="insight in listInsights"
      :key="insight.id"
      :active-insight="activeInsight"
      :insight="insight"
      @delete-insight="deleteInsight(insight.id)"
      @open-editor="openEditor(insight.id)"
      @select-insight="selectInsight(insight)"
     />

    </div>
    <message-display
      v-else
      :message="messageNoData"
    />
  </div>
</template>

<script>
import _ from 'lodash';
import pptxgen from 'pptxgenjs';
import { Packer, Document, SectionType, Footer, Paragraph, AlignmentType, ImageRun, TextRun, HeadingLevel, ExternalHyperlink, UnderlineType } from 'docx';
import { saveAs } from 'file-saver';
import { mapGetters, mapActions } from 'vuex';
import API from '@/api/api';

import { BOOKMARKS } from '@/utils/messages-util';

import InsightCard from '@/components/insight-manager/insight-card';
import DropdownControl from '@/components/dropdown-control';
import MessageDisplay from '@/components/widgets/message-display';

import dateFormatter from '@/formatters/date-formatter';
import stringFormatter from '@/formatters/string-formatter';

export default {
  name: 'ListInsightsPane',
  components: {
    InsightCard,
    DropdownControl,
    MessageDisplay
  },
  data: () => ({
    activeInsight: null,
    exportActive: false,
    listInsights: [],
    messageNoData: BOOKMARKS.NO_DATA,
    selectedInsight: null
  }),
  computed: {
    ...mapGetters({
      project: 'app/project',
      projectMetadata: 'app/projectMetadata',
      currentView: 'app/currentView',
      countInsights: 'insightPanel/countInsights'
    }),
    metadataSummary() {
      const projectCreatedDate = new Date(this.projectMetadata.created_at);
      const projectModifiedDate = new Date(this.projectMetadata.modified_at);
      return `Project: ${this.projectMetadata.name} - Created: ${projectCreatedDate.toLocaleString()} - ` +
        `Modified: ${projectModifiedDate.toLocaleString()} - Corpus: ${this.projectMetadata.corpus_id}`;
    }
  },
  mounted() {
    this.refresh();
  },
  methods: {
    ...mapActions({
      hideInsightPanel: 'insightPanel/hideInsightPanel',
      setCountInsights: 'insightPanel/setCountInsights'
    }),
    dateFormatter,
    stringFormatter,
    refresh() {
      API.get('bookmarks', { params: { project_id: this.project } }).then(d => {
        const listInsights = _.orderBy(d.data, d => d.modified_at, ['desc']);
        this.listInsights = listInsights;
        this.setCountInsights(listInsights.length);
      });
    },
    openEditor(id) {
      if (id === this.activeInsight) {
        this.activeInsight = null;
        return;
      }
      this.activeInsight = id;
    },
    toggleExportMenu() {
      this.exportActive = !this.exportActive;
    },
    closeInsightPanel() {
      this.hideInsightPanel();
      this.activeInsight = null;
      this.selectedInsight = null;
    },
    selectInsight(insight) {
      if (insight === this.selectedInsight) {
        this.selectedInsight = null;
        return;
      }
      this.selectedInsight = insight;
      // Restore the state
      const savedURL = insight.url;
      const currentURL = this.$route.fullPath;
      if (savedURL !== currentURL) {
        this.$router.push(savedURL);
      }
      this.closeInsightPanel();
    },
    deleteInsight(id) {
      API.delete(`bookmarks/${id}`).then(result => {
        const message = result.status === 200 ? BOOKMARKS.SUCCESSFUL_REMOVAL : BOOKMARKS.ERRONEOUS_REMOVAL;
        if (message === BOOKMARKS.SUCCESSFUL_REMOVAL) {
          this.toaster(message, 'success', false);
          const count = this.countInsights - 1;
          this.setCountInsights(count);
          this.refresh();
        } else {
          this.toaster(message, 'error', true);
        }
      });
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

      const sections = this.listInsights.map((bm) => {
        const imageSize = this.scaleImage(bm.thumbnail_source, docxMaxImageSize, docxMaxImageSize);
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
                  data: bm.thumbnail_source,
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
                  link: this.slideURL(bm.url)
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

      this.listInsights.forEach((bm) => {
        const imageSize = this.scaleImage(bm.thumbnail_source, widthLimitImage, heightLimitImage);
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
          data: bm.thumbnail_source,
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
                url: this.slideURL(bm.url)
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
.list-insights-pane-container {
  color: #707070;
  .pane-content {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
  }
  .selected {
    border: 3px solid $selected;
  }
  .pane-header {
    .dropdown-container {
      position: absolute;
      right: 46px;
      padding: 0;
      width: auto;
      height: fit-content;
      // Clip children overflowing the border-radius at the corners
      overflow: hidden;

      &.below {
        top: 48px;
      }
    }
  }
}

</style>
