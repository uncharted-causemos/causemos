<template>
  <modal
    class="modal-document-container"
    @close="close()">
    <template #body>
      <div>
        <div v-if="viewer"
          class="toolbar">
          Show raw text
          <i v-if="showTextViewer === false" class="fa fa-fw fa-toggle-off" @click="toggle" />
          <i v-if="showTextViewer === true" class="fa fa-fw fa-toggle-on" @click="toggle" />
        </div>
      </div>
      <div ref="content"
        class="uncharted-cards-reader-content-container">
        Loading...
      </div>
    </template>
  </modal>
</template>

<script>
import API from '@/api/api';
import Modal from '@/components/modals/modal';
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

// froehlich <= author

export default {
  name: 'ModalDocument',
  components: {
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
    showTextViewer: false
  }),
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
    },
    toggle() {
      this.showTextViewer = !this.showTextViewer;

      removeChildren(this.$refs.content);
      if (this.showTextViewer === true) {
        this.$refs.content.appendChild(this.textViewer.element);
      } else {
        this.$refs.content.appendChild(this.viewer.element);
      }
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
  .toolbar {
    padding: 5px;
  }
  ::v-deep(.uncharted-cards-reader-content .reader-content-header .close-button i) {
    padding-right: 12px;
  }
}
</style>
