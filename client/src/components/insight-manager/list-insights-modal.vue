<template>
  <div class="list-insights-modal-container">
    <full-screen-modal-header
      icon="angle-left"
      nav-back-label="Exit Saved Insights"
      @close="closeInsightPanel"
    >
      <template #trailing>
        <insight-control-menu />
      </template>
    </full-screen-modal-header>

    <div class="tab-controls">
      <tab-bar
        class="tabs"
        :active-tab-id="activeTabId"
        :tabs="tabs"
        @tab-click="switchTab"
      />
      <div class="export">
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
    </div>
    <div class="body flex">
      <analytical-questions-panel />

      <!-- body -->
      <div class="body-main-content flex-col">
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
          <div class="pane-wrapper">
            <div
              v-if="countInsights > 0"
              class="pane-content"
            >
              <insight-card
                v-for="insight in searchedInsights"
                :active-insight="activeInsight"
                :card-mode="true"
                :curated="isCuratedInsight(insight.id)"
                :key="insight.id"
                :insight="insight"
                @delete-insight="deleteInsight(insight.id)"
                @open-editor="openEditor(insight.id)"
                @select-insight="selectInsight(insight)"
                @update-curation="updateCuration(insight.id)"
                draggable
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
                v-for="insight in questionItem.linkedInsights"
                :key="insight.id"
                :insight="insight"
                :show-description="true"
                :show-question="false"
                @delete-insight="deleteInsight(insight.id)"
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
import pptxgen from 'pptxgenjs';
import { Packer, Document, SectionType, Footer, Paragraph, AlignmentType, ImageRun, TextRun, HeadingLevel, ExternalHyperlink, UnderlineType } from 'docx';
import { saveAs } from 'file-saver';
import { mapGetters, mapActions, useStore } from 'vuex';
import API from '@/api/api';

import { INSIGHTS } from '@/utils/messages-util';

import InsightCard from '@/components/insight-manager/insight-card';
import DropdownControl from '@/components/dropdown-control';
import MessageDisplay from '@/components/widgets/message-display';
import TabBar from '@/components/widgets/tab-bar';
import FullScreenModalHeader from '@/components/widgets/full-screen-modal-header';
import InsightControlMenu from '@/components/insight-manager/insight-control-menu';

import dateFormatter from '@/formatters/date-formatter';
import stringFormatter from '@/formatters/string-formatter';
import router from '@/router';
import { getAllInsights } from '@/services/insight-service';
import { ref, watchEffect, computed } from 'vue';

import AnalyticalQuestionsPanel from '@/components/analytical-questions/analytical-questions-panel';


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
    DropdownControl,
    FullScreenModalHeader,
    InsightCard,
    InsightControlMenu,
    MessageDisplay,
    TabBar,
    AnalyticalQuestionsPanel
  },
  data: () => ({
    activeInsight: null,
    activeTabId: INSIGHT_TABS[0].id,
    curatedInsights: [],
    exportActive: false,
    messageNoData: INSIGHTS.NO_DATA,
    search: '',
    selectedInsight: null,
    tabs: INSIGHT_TABS
  }),
  setup() {
    const listInsights = ref([]);
    const store = useStore();
    const contextId = computed(() => store.getters['insightPanel/contextId']);
    const project = computed(() => store.getters['insightPanel/projectId']);

    const questions = computed(() => store.getters['analysisChecklist/questions']);

    // FIXME: refactor into a composable
    watchEffect(onInvalidate => {
      let isCancelled = false;
      async function fetchInsights() {
        const insights = await getAllInsights(project.value, contextId.value);
        if (isCancelled) {
          // Dependencies have changed since the fetch started, so ignore the
          //  fetch results to avoid a race condition.
          return;
        }
        listInsights.value = insights;
        store.dispatch('insightPanel/setCountInsights', listInsights.value.length);
      }
      onInvalidate(() => {
        isCancelled = true;
      });
      fetchInsights();
    });
    return {
      listInsights,
      contextId,
      project,
      questions
    };
  },
  computed: {
    ...mapGetters({
      projectMetadata: 'app/projectMetadata',
      countInsights: 'insightPanel/countInsights'
    }),
    metadataSummary() {
      const projectCreatedDate = new Date(this.projectMetadata.created_at);
      const projectModifiedDate = new Date(this.projectMetadata.modified_at);
      return `Project: ${this.projectMetadata.name} - Created: ${projectCreatedDate.toLocaleString()} - ` +
        `Modified: ${projectModifiedDate.toLocaleString()} - Corpus: ${this.projectMetadata.corpus_id}`;
    },
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
      setCountInsights: 'insightPanel/setCountInsights'
    }),
    dateFormatter,
    stringFormatter,
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
    deleteInsight(id) {
      API.delete(`insights/${id}`).then(result => {
        const message = result.status === 200 ? INSIGHTS.SUCCESSFUL_REMOVAL : INSIGHTS.ERRONEOUS_REMOVAL;
        if (message === INSIGHTS.SUCCESSFUL_REMOVAL) {
          this.toaster(message, 'success', false);
          const count = this.countInsights - 1;
          this.setCountInsights(count);
          this.removeCuration(id);
          this.refresh();
        } else {
          this.toaster(message, 'error', true);
        }
      });
    },
    getInsightSet() {
      if (this.curatedInsights.length > 0) {
        const curatedSet = this.listInsights.filter(i => this.curatedInsights.find(e => e === i.id));
        return curatedSet;
      } else {
        return this.listInsights;
      }
    },
    getSourceUrlForExport(i) {
      return i.url + '?insight_id=' + i.id;
    },
    exportDOCX() {
      // 72dpi * 8.5 inches width, as word perplexingly uses pixels
      // same height as width so that we can attempt to be consistent with the layout.
      const docxMaxImageSize = 612;
      const insightSet = this.selectedInsights;
      const sections = insightSet.map((i) => {
        const imageSize = this.scaleImage(i.thumbnail, docxMaxImageSize, docxMaxImageSize);
        const insightDate = dateFormatter(i.modified_at);
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
              text: `${i.name}`
            }),
            new Paragraph({
              break: 1,
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  data: i.thumbnail,
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
                  text: `${i.description}`
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
                  link: this.slideURL(this.getSourceUrlForExport(i))
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
      const insightSet = this.selectedInsights;
      insightSet.forEach((i) => {
        const imageSize = this.scaleImage(i.thumbnail, widthLimitImage, heightLimitImage);
        const insightDate = dateFormatter(i.modified_at);
        const slide = pres.addSlide();
        const notes = `Title: ${i.name}\nDescription: ${i.description}\nCaptured on: ${insightDate}\n${this.metadataSummary}`;

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
          data: i.thumbnail,
          // centering image code for x & y limited by consts for max content size
          // plus base offsets needed to stay clear of other elements
          x: (widthLimitImage - imageSize.width) / 2,
          y: (heightLimitImage - imageSize.height) / 2,
          w: imageSize.width,
          h: imageSize.height
        });
        slide.addText([
          {
            text: `${i.name}: `,
            options: {
              bold: true,
              color: '000088',
              hyperlink: {
                url: this.slideURL(this.getSourceUrlForExport(i))
              }
            }
          },
          {
            text: `${i.description} `,
            options: {
              break: false
            }
          },
          {
            text: `\n(Captured on: ${insightDate} - ${this.metadataSummary} `,
            options: {
              break: false
            }
          },
          {
            text: 'View On Causemos',
            options: {
              break: false,
              color: '000088',
              hyperlink: {
                url: this.slideURL(this.getSourceUrlForExport(i))
              }
            }
          },
          {
            text: '.)',
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
    getFileName() {
      const date = new Date();
      const formattedDate = dateFormatter(date, 'YYYY-MM-DD hh:mm:ss a');
      return `Causemos ${this.projectMetadata.name} ${formattedDate}`;
    },
    getPngDimensionsInPixels(base64png) {
      const header = atob(base64png.slice(22, 72)).slice(16, 24);
      const uint8 = Uint8Array.from(header, c => c.charCodeAt(0));
      const dataView = new DataView(uint8.buffer);
      const width = dataView.getInt32(0);
      const height = dataView.getInt32(4);
      return { height, width };
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
    openExport() {
      this.exportActive = true;
    },
    async refresh() {
      const listInsights = await getAllInsights(this.project, this.contextId);
      this.listInsights = listInsights;
      this.setCountInsights(listInsights.length);
    },
    removeCuration(id) {
      this.curatedInsights = this.curatedInsights.filter((ci) => ci !== id);
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
    },
    selectInsight(insight) {
      if (insight === this.selectedInsight) {
        this.selectedInsight = null;
        return;
      }
      this.selectedInsight = insight;
      const savedURL = insight.url;
      const currentURL = this.$route.fullPath;
      if (savedURL !== currentURL) {
        // FIXME: refactor and use getSourceUrlForExport() to retrive final url with insight_id appended
        const finalURL = savedURL.includes('insight_id') ? savedURL : savedURL + '?insight_id=' + this.selectedInsight.id;
        this.$router.push(finalURL);
      } else {
        router.push({
          query: {
            insight_id: this.selectedInsight.id
          }
        }).catch(() => {});
      }
      this.closeInsightPanel();
    },
    slideURL(slideURL) {
      return `${window.location.protocol}//${window.location.host}/#${slideURL}`;
    },
    switchTab(id) {
      this.activeInsight = null;
      this.selectedInsight = null;
      this.activeTabId = id;

      // FIXME: reload insights since questions most recent question stuff may not be up to date
    },
    toggleExportMenu() {
      this.exportActive = !this.exportActive;
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
  justify-content: top;
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
  }
  .cards {
    background-color: $background-light-2;
    display: inline-block;
    height: 100%;
    overflow: auto;
    padding: 1rem;
    .search {
      display: flex;
      padding: 0 0 1rem;
      .form-control {
        flex: 1 1 auto;
      }
    }
    .pane-wrapper {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      overflow: auto;
      .pane-content {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
      }
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
