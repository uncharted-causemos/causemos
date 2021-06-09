<template>
  <modal
    class="modal-document-container"
    @close="close()">
    <template #body>
      <documents-reader-content
        :data="readerContentData"
        :switch-button-data="switchButtonData"
        @click-close-icon="close"
      />
    </template>
  </modal>
</template>

<script>
import _ from 'lodash';
import { mapGetters } from 'vuex';
import API from '@/api/api';
import { toCardData, DOC_FIELD } from '@/utils/document-util';
import Modal from '@/components/modals/modal';
import DocumentsReaderContent from '@/components/kb-explorer/documents-reader-content';
import { createPDFViewer } from '@/utils/pdf/viewer';

const CONTENT_WIDTH = 800;

const isPdf = (data) => {
  const fileType = data && data[DOC_FIELD.FILE_TYPE];
  return fileType === 'pdf' || fileType === 'application/pdf';
};

export default {
  name: 'ModalDocument',
  components: {
    DocumentsReaderContent,
    Modal
  },
  props: {
    documentData: {
      type: Object,
      default: () => ({})
    }
  },
  data: () => ({
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
      if (!this.documentData) return;
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
  }
  ::v-deep(.uncharted-cards-reader-content .reader-content-header .close-button i) {
    padding-right: 12px;
  }
}
</style>
