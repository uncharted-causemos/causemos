<template>
  <div class="list-bookmarks-pane-container">
    <modal
      v-if="exportActive"
      :use-green-header="true"
      :show-close-button="true"
      @close="exportActive = false">
       <template #header>
          <h4>Export</h4>
        </template>
        <template #body>
          Select a format to export to.
        </template>
        <template #footer>
          <ul class="unstyled-list">
            <button
              class="btn first-button"
              type="button"
              @click.stop="exportActive = false"
            >
              Cancel
            </button>
            <button
              class="btn btn-primary"
              type="button"
              @click.stop="exportPPTX"
            >
              Powerpoint
            </button>
            <button
              class="btn btn-primary"
              type="button"
              @click.stop="exportDOCX"
            >
              Word
            </button>
          </ul>
        </template>
    </modal>
    <div class="pane-header">
      <h6>Saved Insights</h6>
      <button
        class="btn btn-primary"
        @click="openExport()"
      >
        Export
      </button>
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
              {{ stringFormatter(bookmark.title, 25) }}
            </div>
            <div @click.stop="openEditor(bookmark.id)">
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
                :src="bookmark.thumbnail_source"
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
import _ from 'lodash';
import pptxgen from 'pptxgenjs';
import { Packer, Document, SectionType, Paragraph, AlignmentType, ImageRun, TextRun, HeadingLevel, ExternalHyperlink, UnderlineType } from 'docx';
import { saveAs } from 'file-saver';
import { mapGetters, mapActions } from 'vuex';
import API from '@/api/api';
import Modal from '@/components/modals/modal';

import { BOOKMARKS } from '@/utils/messages-util';

import BookmarkEditor from '@/components/bookmark-panel/bookmark-editor';
import CloseButton from '@/components/widgets/close-button';
import MessageDisplay from '@/components/widgets/message-display';
import stringFormatter from '@/formatters/string-formatter';

export default {
  name: 'ListBookmarksPane',
  components: {
    BookmarkEditor,
    CloseButton,
    MessageDisplay,
    Modal
  },
  data: () => ({
    activeBookmark: null,
    exportActive: false,
    listBookmarks: [],
    messageNoData: BOOKMARKS.NO_DATA,
    selectedBookmark: null
  }),
  computed: {
    ...mapGetters({
      project: 'app/project',
      currentView: 'app/currentView',
      countBookmarks: 'bookmarkPanel/countBookmarks'
    })
  },
  mounted() {
    this.refresh();
  },
  methods: {
    ...mapActions({
      hideBookmarkPanel: 'bookmarkPanel/hideBookmarkPanel',
      setCountBookmarks: 'bookmarkPanel/setCountBookmarks'
    }),
    stringFormatter,
    refresh() {
      API.get('bookmarks', { params: { project_id: this.project } }).then(d => {
        const listBookmarks = _.orderBy(d.data, d => d.modified_at, ['desc']);
        this.listBookmarks = listBookmarks;
        this.setCountBookmarks(listBookmarks.length);
      });
    },
    openEditor(id) {
      if (id === this.activeBookmark) {
        this.activeBookmark = null;
        return;
      }
      this.activeBookmark = id;
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
      // Restore the state
      const savedURL = bookmark.url;
      const currentURL = this.$route.fullPath;
      if (savedURL !== currentURL) {
        this.$router.push(savedURL);
      }
    },
    deleteBookmark(id) {
      API.delete(`bookmarks/${id}`).then(result => {
        const message = result.status === 200 ? BOOKMARKS.SUCCESSFUL_REMOVAL : BOOKMARKS.ERRONEOUS_REMOVAL;
        if (message === BOOKMARKS.SUCCESSFUL_REMOVAL) {
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
      return 'Causemos' + date.toUTCString();
    },
    baseURL() {
      return window.location.href.split('/#/')[0];
    },
    exportDOCX() {
      // 72dpi * 8.5 inches width, as word perplexing uses pixels
      // same height as width so that we can attempt to be consistent with the layout.
      const docxMaxImageSize = 612;

      const sections = this.listBookmarks.map((bm) => {
        const imageSize = this.scaleImage(bm.thumbnail_source, docxMaxImageSize, docxMaxImageSize);
        return {
          properties: {
            type: SectionType.NEXT_PAGE
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              heading: HeadingLevel.HEADING_1,
              text: `${bm.title}\n\n`
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  data: bm.thumbnail_source,
                  transformation: {
                    height: imageSize.height,
                    width: imageSize.width
                  }
                }),
                new ExternalHyperlink({
                  child: new TextRun({
                    break: 1,
                    text: 'View Original',
                    underline: {
                      type: UnderlineType.SINGLE
                    }
                  }),
                  link: `${this.baseURL()}/#${bm.url}`
                })
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              text: `\n\n${bm.description}`
            })
          ]
        };
      });

      const doc = new Document({ sections });

      Packer.toBlob(doc).then(blob => {
        saveAs(blob, `${this.getFileName()}.docx`);
      });
      this.exportActive = false;
    },
    exportPPTX() {
      const Pptxgen = pptxgen;
      const pres = new Pptxgen();

      // some PPTX consts as powerpoint does everything in inches & has hard boundaries
      const widthLimitImage = 10;
      const heightLimitImage = 4.5;

      this.listBookmarks.forEach((bm) => {
        const slide = pres.addSlide();
        slide.addText(bm.title, {
          x: 0,
          y: 0,
          w: 10,
          h: 0.5,
          color: '363636',
          align: pres.AlignH.center,
          hyperlink: {
            url: `${this.baseURL()}/#${bm.url}`
          }
        });

        const imageSize = this.scaleImage(bm.thumbnail_source, widthLimitImage, heightLimitImage);
        slide.addImage({
          data: bm.thumbnail_source,
          // centering image code for x & y limited by consts for max content size
          // plus base offsets needed to stay clear of other elements
          x: (widthLimitImage - imageSize.width) / 2,
          y: 0.5 + (heightLimitImage - imageSize.height) / 2,
          w: imageSize.width,
          h: imageSize.height
        });
        slide.addText(bm.description, {
          x: 0,
          y: 5,
          w: 10,
          h: 0.5,
          color: '363636',
          align: pres.AlignH.center
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
    }
      .bookmark-title {
        font-weight: bold;
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

</style>
