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
      <div>
        <hr>
        <table v-if="documentData">
          <tr>
            <td class="doc-label">Publication Date</td>
            <td>{{ dateFormatter(documentData.publication_date.date, 'YYYY-MM-DD') }}</td>
          </tr>
          <tr>
            <td class="doc-label">Publisher</td>
            <td class="doc-value">{{ documentData.publisher_name }}</td>
          </tr>
          <tr>
            <td class="doc-label">Author</td>
            <td class="doc-value">{{ documentData.author }}</td>
          </tr>
          <tr>
            <td class="doc-label">Locations</td>
            <td class="doc-value">{{ documentData.ner_analytics.loc.join(', ') }} </td>
          </tr>
          <tr>
            <td class="doc-label">Organizations</td>
            <td class="doc-value">{{ documentData.ner_analytics.org.join(', ') }}</td>
          </tr>
        </table>
      </div>
    </template>
  </modal>
</template>

<script>
import API from '@/api/api';
import Modal from '@/components/modals/modal';
import { createPDFViewer } from '@/utils/pdf/viewer';
import { removeChildren } from '@/utils/dom-util';
import dateFormatter from '@/formatters/date-formatter';

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
    dateFormatter,
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
  }

  ::v-deep(.modal-container) {
    padding: 0;
    width: 800px;

    .modal-header, .modal-footer {
      display: none;
    }
    .modal-body {
      padding: 0;
      margin: 0;
      height: 80vh;
      overflow-y: auto;
    }
  }
  .toolbar {
    padding: 5px;
  }
}
</style>
