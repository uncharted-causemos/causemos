<template>
  <div class="list-bookmarks-pane-container">
    <div class="pane-header">
      <h6>Saved Insights</h6>
      <dropdown-button
        class="export-dropdown"
        :inner-button-label="'Export'"
        :items="['Powerpoint', 'Word']"
        @item-selected="exportBookmark"
      />
      <close-button @click="closeBookmarkPanel()" />
    </div>
    <div
      v-if="listBookmarks.length > 0"
      class="pane-content">
      <div
        v-for="bookmark in listBookmarks"
        :key="bookmark.id">
        <div
          class="bookmark"
          :class="{ 'selected': selectedBookmark === bookmark, '': selectedBookmark !== bookmark }"
          @click="selectBookmark(bookmark)">
          <div class="bookmark-header">
            <div class="bookmark-title">
              <i class="fa fa-star"></i>
              {{ stringFormatter(bookmark.name, 25) }}
            </div>
            <div class="bookmark-action" @click.stop="openEditor(bookmark.id)">
              <i class="fa fa-ellipsis-h bookmark-header-btn" />
              <bookmark-editor
                v-if="activeBookmark === bookmark.id"
                @delete="deleteBookmark(bookmark.id)"
              />
            </div>
          </div>
          <div
            class="bookmark-content">
            <div class="bookmark-thumbnail">
              <img
                :src="bookmark.thumbnail"
                class="thumbnail">
            </div>
            <div
              v-if="bookmark.description.length > 0"
              class="bookmark-description">
              {{ bookmark.description }}
            </div>
            <div
              v-else
              class="bookmark-empty-description">No description provided</div>
          </div>
        </div>
      </div>
    </div>
    <message-display
      v-else
      :message="messageNoData"
    />
  </div>
</template>

<script>
import pptxgen from 'pptxgenjs';
import { Packer, Document, SectionType, Footer, Paragraph, AlignmentType, ImageRun, TextRun, HeadingLevel, ExternalHyperlink, UnderlineType } from 'docx';
import { saveAs } from 'file-saver';
import { mapGetters, mapActions, useStore } from 'vuex';
import API from '@/api/api';
import DropdownButton from '@/components/dropdown-button.vue';

import { INSIGHTS } from '@/utils/messages-util';

import BookmarkEditor from '@/components/bookmark-panel/bookmark-editor';
import CloseButton from '@/components/widgets/close-button';
import MessageDisplay from '@/components/widgets/message-display';

import dateFormatter from '@/formatters/date-formatter';
import stringFormatter from '@/formatters/string-formatter';

import router from '@/router';
import { getInsights } from '@/services/insight-service';
import { ref, watchEffect, computed } from 'vue';

export default {
  name: 'ListBookmarksPane',
  components: {
    BookmarkEditor,
    CloseButton,
    DropdownButton,
    MessageDisplay
  },
  data: () => ({
    activeBookmark: null,
    exportActive: false,
    messageNoData: INSIGHTS.NO_DATA,
    selectedBookmark: null
  }),
  setup() {
    const listBookmarks = ref([]);
    const store = useStore();
    const publishedModelId = computed(() => store.getters['insightPanel/publishedModelId']);
    const project = computed(() => store.getters['insightPanel/projectId']);
    const currentView = computed(() => store.getters['app/currentView']);

    // FIXME: refactor into a composable
    watchEffect(onInvalidate => {
      let isCancelled = false;
      async function fetchInsights() {
        const insights = await getInsights(project.value, publishedModelId.value, currentView.value);
        if (isCancelled) {
          // Dependencies have changed since the fetch started, so ignore the
          //  fetch results to avoid a race condition.
          return;
        }
        listBookmarks.value = insights;
        store.dispatch('bookmarkPanel/setCountBookmarks', listBookmarks.value.length);
      }
      onInvalidate(() => {
        isCancelled = true;
      });
      fetchInsights();
    });
    return {
      listBookmarks,
      publishedModelId,
      currentView,
      project
    };
  },
  computed: {
    ...mapGetters({
      projectMetadata: 'app/projectMetadata',
      countBookmarks: 'bookmarkPanel/countBookmarks'
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
      hideBookmarkPanel: 'bookmarkPanel/hideBookmarkPanel',
      setCountBookmarks: 'bookmarkPanel/setCountBookmarks'
    }),
    stringFormatter,
    async refresh() {
      const listBookmarks = await getInsights(this.project, this.publishedModelId, this.currentView);
      this.listBookmarks = listBookmarks;
      this.setCountBookmarks(listBookmarks.length);
    },
    exportBookmark(item) {
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
    openEditor(id) {
      if (id === this.activeBookmark) {
        this.activeBookmark = null;
        return;
      }
      this.activeBookmark = id;
    },
    toggleExportMenu() {
      this.exportActive = !this.exportActive;
    },
    closeBookmarkPanel() {
      this.hideBookmarkPanel();
      this.activeBookmark = null;
      this.selectedBookmark = null;
    },
    selectBookmark(bookmark) {
      if (bookmark === this.selectedBookmark) {
        this.selectedBookmark = null;
        return;
      }
      this.selectedBookmark = bookmark;
      router.push({
        query: {
          insight_id: this.selectedBookmark.id
        }
      }).catch(() => {});
    },
    deleteBookmark(id) {
      API.delete(`insights/${id}`).then(result => {
        const message = result.status === 200 ? INSIGHTS.SUCCESSFUL_REMOVAL : INSIGHTS.ERRONEOUS_REMOVAL;
        if (message === INSIGHTS.SUCCESSFUL_REMOVAL) {
          this.toaster(message, 'success', false);
          const count = this.countBookmarks - 1;
          this.setCountBookmarks(count);
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

      const sections = this.listBookmarks.map((bm) => {
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

      this.listBookmarks.forEach((bm) => {
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
.list-bookmarks-pane-container {
  color: #707070;
  .pane-header{
    > button {
      margin-right: 35px;
    }
  }
  .bookmark {
    cursor: pointer;
    padding: 5px 5px 10px;
    border-bottom: 1px solid #e5e5e5;
    .bookmark-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      .bookmark-header-btn {
        cursor: pointer;
        padding: 5px;
        color: gray;
      }
      .bookmark-action {
        flex: 0 1 auto;
      }
      .bookmark-title {
        flex: 1 1 auto;
        font-weight: bold;
      }
    }
      .bookmark-empty-description {
        color: #D6DBDF;
      }
      .bookmark-thumbnail {
        .thumbnail {
          width:  100%;
          min-height: 100px;
        }
      }

  }
  .selected {
    border: 3px solid $selected;
  }
}

.export-dropdown {
  margin-right: 3rem;
}

</style>
