<template>
  <modal class="modal-document-container" @close="close()">
    <template #body>
      <div class="metadata">
        <table v-if="documentData" style="border-bottom: 1px solid #e3e3e3">
          <tr>
            <td class="doc-label">Publication Date</td>
            <td>
              {{
                dateFormatter(
                  documentMeta
                    ? documentMeta.mod_date
                    : documentData.publication_date.date ?? 'Date not found',
                  'YYYY-MM-DD'
                )
              }}
            </td>
          </tr>
          <tr>
            <td class="doc-label">Publisher</td>
            <td v-if="!editable" class="doc-value">{{ publisher ?? 'Publisher not found' }}</td>
            <td v-else class="doc-value">
              <input v-model="publisher" />
            </td>
          </tr>
          <tr>
            <td class="doc-label">Author</td>
            <td v-if="!editable" class="doc-value">{{ author ?? 'Author not found' }}</td>
            <td v-else class="doc-value">
              <input v-model="author" />
            </td>
          </tr>
          <tr>
            <td class="doc-label">Title</td>
            <td v-if="!editable" class="doc-value">{{ title ?? 'Title not found' }}</td>
            <td v-else class="doc-value">
              <input v-model="title" />
            </td>
          </tr>
        </table>
      </div>
      <div v-if="pdfViewer" class="toolbar">
        Show raw text
        <i v-if="showTextViewer === false" class="fa fa-lg fa-fw fa-toggle-off" @click="toggle" />
        <i v-if="showTextViewer === true" class="fa fa-lg fa-fw fa-toggle-on" @click="toggle" />
      </div>
      <div v-if="isLoading" class="loading-indicator status">
        <i class="fa fa-spin fa-spinner" />
        <h2>Loading data...</h2>
      </div>
      <div v-if="!documentData && !isLoading" class="no-data status">Document not found.</div>
      <div ref="content" v-html="formattedText"></div>
      <div ref="loadMoreText" class="load-more-text">
        <h5 v-if="useScrolling && hasScrollId">Loading body text ...</h5>
        <h5 v-if="useScrolling && !hasScrollId">---- End of document ----</h5>
      </div>
    </template>
    <template #footer>
      <button v-if="!disableEdit && !editable" class="btn btn-md btn-secondary" @click="edit()">
        <i class="fa fa-fw fa-edit" /> Edit
      </button>
      <button v-if="!disableEdit && editable" class="btn btn-md btn-secondary" @click="save()">
        <i class="fa fa-fw fa-save" />Save
      </button>
      <div class="spacer"></div>
      <button v-if="!disableEdit && editable" class="btn btn-md btn-secondary" @click="cancel()">
        Cancel
      </button>
      <button class="btn btn-md btn-primary" @click="close()">Close</button>
      <button
        v-if="$route.name === 'kbExplorer'"
        class="btn btn-md btn-primary"
        @click="addToSearch()"
      >
        Add to search
      </button>
    </template>
  </modal>
</template>

<script>
import Modal from '@/components/modals/modal.vue';
import { mapActions } from 'vuex';
import { createPDFViewer } from '@/utils/pdf/viewer';
import { removeChildren } from '@/utils/dom-util';
import dateFormatter from '@/formatters/date-formatter';
import { getDocument, updateDocument } from '@/services/document-service';
import { createTextViewer } from '@/utils/text-viewer-util';

const isPdf = (data) => {
  const fileType = data && data.file_type;
  return fileType === 'pdf' || fileType === 'application/pdf';
};

export default {
  name: 'ModalDocument',
  components: {
    Modal,
  },
  props: {
    documentId: {
      type: String,
      required: true,
    },
    textFragment: {
      type: String,
      default: null,
    },
    disableEdit: {
      // if custom document then we may not provide editing capability
      type: Boolean,
      default: false,
    },
    retrieveDocumentMeta: {
      // if custom handler, document metadata must be collected separately.  Function is provided.
      type: Function,
      default: null,
    },
    retrieveDocument: {
      // original function (getDocument) is retained as default.  User may provide custom function if required.
      type: Function,
      default: getDocument,
    },
    contentHandler: {
      // custom document retrieval will have a different data structure, provide the handler to create body text
      type: Function,
      default: null,
    },
    useScrolling: {
      type: Boolean,
      default: false,
    },
    highlightsForSelected: {
      type: Array,
      default: null,
    },
  },
  data: () => ({
    isLoading: false,
    documentData: null,
    textViewer: null,
    pdfViewer: null,
    textOnly: false,
    showTextViewer: false,
    editable: false,
    author: '',
    publisher: '',
    title: '',
    documentMeta: null,
    scrollId: null,
    scrollPlaceholder: null,
    scrollObserver: null,
    formattedText: null,
  }),
  mounted() {
    this.refresh();

    if (this.useScrolling) {
      if (this.useScrolling) {
        this.scrollObserver = new IntersectionObserver(this.getScrollData, {
          root: this.$refs.modalBody,
          rootMargin: '0px',
          threshold: 0.25,
        });
        this.scrollObserver.observe(this.$refs.loadMoreText);
      }
    }
  },
  computed: {
    hasScrollId() {
      return this.scrollId !== null;
    },
  },
  methods: {
    ...mapActions({
      addSearchTerm: 'query/addSearchTerm',
    }),
    applyHighlights(content) {
      if (this.highlightsForSelected !== null) {
        let highlightContent = content;
        this.highlightsForSelected.forEach((highlight) => {
          highlightContent = highlightContent.replaceAll(
            highlight.text,
            `<span class="dojo-mark">${highlight.text}</span>`
          );
        });
        return highlightContent;
      }
      return content;
    },
    dateFormatter,
    async getScrollData() {
      if (this.scrollId !== null && this.contentHandler !== null) {
        const content = await this.retrieveDocument(this.documentId, this.scrollId);
        this.documentData = this.contentHandler(content, this.documentData);
        this.textViewer = createTextViewer(this.applyHighlights(this.documentData), true);

        // brute force the entire view
        if (this.$refs.content.hasChildNodes()) {
          removeChildren(this.$refs.content);
        }

        if (this.textOnly === true) {
          this.$refs.content.appendChild(this.textViewer.element);
          if (this.textFragment) {
            this.textViewer.search(this.textFragment);
          }
        }

        if (content.scroll_id === null) {
          this.scrollId = null;
          this.scrollObserver = null; // end of scroll loading.
        }
      }
    },
    refresh() {
      this.fetchReaderContent();
    },
    async fetchReaderContent() {
      this.isLoading = true;

      if (this.retrieveDocumentMeta && this.documentId) {
        this.documentMeta = await this.retrieveDocumentMeta(this.documentId);
      }

      const content = this.useScrolling
        ? await this.retrieveDocument(this.documentId, this.scrollId)
        : await this.retrieveDocument(this.documentId);

      if (this.contentHandler) {
        this.scrollId = content.scroll_id ?? null;
        this.documentData = this.contentHandler(content, this.documentData, this.useScrolling);
      } else {
        this.documentData = content.data;
      }
      this.isLoading = false;

      if (this.documentData) {
        if (this.documentMeta) {
          this.setFieldsFromDocumentMeta();
        } else {
          this.setFieldsFromDocumentData();
        }

        if (this.contentHandler) {
          this.textViewer = createTextViewer(this.applyHighlights(this.documentData), true); // provided contentHandler has generated a simple HTML string.
        } else {
          this.textViewer = createTextViewer(this.documentData.extracted_text);
        }

        const useDART = true;

        if (isPdf(this.documentData) && useDART) {
          const rawDocUrl = `/api/dart/${this.documentId}/raw`;
          try {
            this.pdfViewer = await createPDFViewer({ url: rawDocUrl });
          } catch (_) {
            this.textOnly = true;
          }
        } else {
          this.textOnly = true;
        }

        if (this.$refs.content.hasChildNodes()) {
          removeChildren(this.$refs.content);
        }

        if (this.textOnly === true) {
          this.$refs.content.appendChild(this.textViewer.element);
          if (this.textFragment) {
            this.textViewer.search(this.textFragment);
          }
        } else {
          this.$refs.content.appendChild(this.pdfViewer.element);
          if (this.textFragment) {
            this.pdfViewer.search(this.textFragment);
          }
        }
      }
    },
    toggle() {
      this.showTextViewer = !this.showTextViewer;

      removeChildren(this.$refs.content);
      if (this.showTextViewer === true) {
        this.$refs.content.appendChild(this.textViewer.element);
      } else {
        this.$refs.content.appendChild(this.pdfViewer.element);
      }
    },
    addToSearch() {
      this.addSearchTerm({
        field: 'docId',
        term: this.documentId,
      });
      this.close();
    },
    close() {
      this.$emit('close', null);
    },
    setFieldsFromDocumentData() {
      this.author = this.documentData.author;
      this.publisher = this.documentData.publisher_name;
      this.title = this.documentData.doc_title;
    },
    setFieldsFromDocumentMeta() {
      this.author = this.documentMeta.author;
      this.publisher = this.documentMeta.producer;
      this.title = this.documentMeta.title;
    },
    edit() {
      // scroll up to edit zone;
      const anchor = this.$refs.modalBody;
      anchor.scrollTop = 0;
      this.setFieldsFromDocumentData();
      this.editable = true;
    },
    cancel() {
      this.setFieldsFromDocumentData();
      this.editable = false;
    },
    async save() {
      this.editable = false;
      const updatedData = {
        id: this.documentData.id,
        author: this.author,
        docTitle: this.title,
        publisherName: this.publisher,
      };
      await updateDocument(updatedData);
      this.refresh();
    },
  },
};
</script>

<style lang="scss" scoped>
@import '@/styles/variables';
@import '@/styles/uncharted-design-tokens';

.status {
  height: 70vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.loading-indicator {
  height: 100px;
  background: $un-color-black-5;
  animation: fading 1s ease infinite alternate;
}

.modal-document-container {
  .metadata {
    margin-top: 2rem;
    table {
      margin-right: 3rem;
      width: 100%;
    }
  }
  .doc-label {
    vertical-align: baseline;
    width: 220px;
    text-align: right;
    padding: 1px 3px;
    font-weight: 600;
  }

  .doc-value {
    text-align: left;
    padding: 1px 3px;
    max-width: 400px;
    input {
      width: calc(100% - 5rem);
    }
  }

  :deep(.modal-container) {
    padding: 0;
    width: 800px;

    .modal-header {
      display: none;
    }

    .modal-footer {
      display: flex;
      align-content: flex-end;
      .spacer {
        flex: 1 1 auto;
      }
    }
    .modal-body {
      padding: 0;
      margin: 0;
      height: 80vh;
      overflow-y: auto;
      overflow-x: hidden;

      div div p span.dojo-mark {
        color: $accent-medium;
        background-color: $accent-lightest;
        border: 1px solid $accent-light;
        padding: 0 2px;
      }
    }
  }
  .toolbar {
    padding: 5px;
  }
  .load-more-text {
    text-align: center;
  }

  /* Bootstrap sets all box-sizing to border-box, which messes up the pdf-js library */
  :deep(.page) {
    box-sizing: content-box !important;
  }
}
</style>
