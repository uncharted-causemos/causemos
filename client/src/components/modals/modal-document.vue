<template>
  <modal
    class="modal-document-container"
    @close="close()">
    <template #body>
      <div>
        <div v-if="viewer">
          Show raw text
          <i v-if="showTextViewer === false" class="fa fa-fw fa-toggle-off" @click="toggle" />
          <i v-if="showTextViewer === true" class="fa fa-fw fa-toggle-on" @click="toggle" />
        </div>
      </div>
      <div ref="content"
        class="uncharted-cards-reader-content-container">
        Loading...
      </div>
      <!--
      <documents-reader-content
        v-if="documentData"
        :document="documentData"
        :viewer="viewer" />
      -->
      <!--
      <documents-reader-content
        :document="documentData" />
      -->
      <!--
      <documents-reader-content
        :data="readerContentData"
        :switch-button-data="switchButtonData"
        @click-close-icon="close"
      />
      -->
    </template>
  </modal>
</template>

<script>
// import _ from 'lodash';
import { mapGetters } from 'vuex';
import API from '@/api/api';
import { toCardData } from '@/utils/document-util';
import Modal from '@/components/modals/modal';
// import DocumentsReaderContent from '@/components/kb-explorer/documents-reader-content';
import { createPDFViewer } from '@/utils/pdf/viewer';
import { removeChildren } from '@/utils/dom-util';

const CONTENT_WIDTH = 800;

const isPdf = (data) => {
  const fileType = data && data.file_type;
  return fileType === 'pdf' || fileType === 'application/pdf';
};

const createTextViewer = (text) => {
  const el = document.createElement('div');
  el.innerHTML = text;
  el.style.paddingTop = '30px';
  el.style.paddingLeft = '15px';
  el.style.paddingRight = '15px';
  el.style.paddingBottom = '15px';
  return el;
};

export default {
  name: 'ModalDocument',
  components: {
    // DocumentsReaderContent,
    Modal
  },
  props: {
    documentId: {
      type: String,
      required: true
    }
  },
  data: () => ({
    documentData: null,
    textViewer: null,
    viewer: null,
    textOnly: false,
    showTextViewer: false,

    readerContentCustomElementData: {},
    readerContentRawData: {},
    readerContentData: {},
    switchButtonData: {
      show: false,
      tooltip: '',
      onClick: () => {}
    }
  }),
  computed: {
    ...mapGetters({
      collection: 'app/collection'
    })
  },
  mounted() {
    this.refresh();
  },
  methods: {
    refresh() {
      this.fetchReaderContent();
    },
    async fetchReaderContent() {
      const url = `documents/${this.documentId}`;
      this.documentData = (await API.get(url)).data;
      this.textViewer = {
        element: createTextViewer(this.documentData.extracted_text)
      };

      if (isPdf(this.documentData)) {
        const rawDocUrl = `/api/dart/${this.documentId}/raw`;
        try {
          const viewer = await createPDFViewer({ url: rawDocUrl, contentWidth: CONTENT_WIDTH });
          viewer.renderPages();
          this.viewer = viewer;
        } catch (_) {
          this.textOnly = true;
        }
      } else {
        this.textOnly = true;
      }

      removeChildren(this.$refs.content);
      if (this.textOnly === true) {
        this.$refs.content.appendChild(this.textViewer.element);
      } else {
        this.$refs.content.appendChild(this.viewer.element);
      }

      /*
      this.readerContentData = Object.assign(toCardData(this.documentData), { content: 'Loading...' });
      const docId = this.documentData[DOC_FIELD.DOC_ID] || this.documentData.doc_id;

      const url = `documents/${docId}`;
      const { data } = await API.get(url);

      // update raw content data
      this.readerContentRawData = data ? toCardData(data) : {};

      // fetch and update custom element content data
      const viewer = await this.fetchReaderContentRawDoc(data, docId);

      const isRawData = !isPdf(data) || _.isNil(viewer); // if pdf, we provide custom element

      // render reader content with custom element data (pdf viewer) by default
      this.updateReaderContentData(isRawData, isRawData);
      return viewer && viewer.renderPages();
      */
    },
    toggle() {
      console.log('toggle');
      this.showTextViewer = !this.showTextViewer;

      removeChildren(this.$refs.content);
      if (this.showTextViewer === true) {
        this.$refs.content.appendChild(this.textViewer.element);
      } else {
        this.$refs.content.appendChild(this.viewer.element);
      }
    },
    async fetchReaderContentRawDoc(docData, docId) {
      if (!isPdf(docData)) return;
      const rawDocUrl = `/api/dart/${docId}/raw`;
      try {
        const viewer = await createPDFViewer({ url: rawDocUrl, contentWidth: CONTENT_WIDTH });
        this.readerContentCustomElementData = Object.assign(toCardData(docData), { content: viewer.element });
        return viewer;
      } catch (error) {
      }
    },
    updateReaderContentData(isRaw = false, disableSwtich = false) {
      this.readerContentData = isRaw ? this.readerContentRawData : this.readerContentCustomElementData;
      this.switchButtonData = isRaw ? {
        show: !disableSwtich,
        onClick: () => this.updateReaderContentData(false),
        isOn: false
      } : {
        show: !disableSwtich,
        onClick: () => this.updateReaderContentData(true),
        isOn: true
      };
    },
    close() {
      this.$emit('close', null);
    }
  }
};
</script>

<style lang="scss" scoped>
.modal-document-container {
  ::v-deep(.modal-container) {
    padding: 0;
    width: 800px;

    .modal-header, .modal-footer {
      display: none;
    }
    .modal-body {
      padding: 0;
      margin: 0;
    }
  }
  .uncharted-cards-reader-content-container {
    height: 80vh;
    overflow-y: scroll;
  }
  ::v-deep(.uncharted-cards-reader-content .reader-content-header .close-button i) {
    padding-right: 12px;
  }
}
</style>
