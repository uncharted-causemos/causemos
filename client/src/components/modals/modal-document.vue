<template>
  <modal
    class="modal-document-container"
    @close="close()">
    <template #body>
      <div v-if="viewer"
        class="toolbar">
        Show raw text
        <i v-if="showTextViewer === false" class="fa fa-lg fa-fw fa-toggle-off" @click="toggle" />
        <i v-if="showTextViewer === true" class="fa fa-lg fa-fw fa-toggle-on" @click="toggle" />
      </div>
      <div ref="content">
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

const isPdf = (data) => {
  const fileType = data && data.file_type;
  return fileType === 'pdf' || fileType === 'application/pdf';
};

const reformat = (v) => {
  return `<span class='extract-text-anchor' style='background: #56b3e9'>${v}</span>`;
};

// Run through a list of sucessive transform to try to find the correct match
const lossySearch = (text, textFragment) => {
  let fragment = textFragment;
  fragment = fragment.replaceAll(' .', '.');
  if (text.search(fragment) >= 0) return text.replace(fragment, reformat(fragment));

  fragment = fragment.replaceAll(' ;', ';');
  if (text.search(fragment) >= 0) return text.replace(fragment, reformat(fragment));

  fragment = fragment.replaceAll(' ,', ',');
  if (text.search(fragment) >= 0) return text.replace(fragment, reformat(fragment));

  return text;
};


const createTextViewer = (text, textFragment) => {
  const el = document.createElement('div');

  if (textFragment) {
    if (text.search(textFragment) >= 0) {
      text = text.replace(textFragment, reformat(textFragment));
    } else {
      text = lossySearch(text, textFragment);
    }
  }

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
    Modal
  },
  props: {
    documentId: {
      type: String,
      required: true
    },
    textFragment: {
      type: String,
      default: null
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
        element: createTextViewer(this.documentData.extracted_text, this.textFragment)
      };

      if (isPdf(this.documentData)) {
        const rawDocUrl = `/api/dart/${this.documentId}/raw`;
        try {
          const viewer = await createPDFViewer({ url: rawDocUrl });
          await viewer.renderPages();
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

        const anchor = document.getElementsByClassName('extract-text-anchor')[0];
        if (anchor) {
          const scroller = document.getElementsByClassName('modal-body')[0];
          scroller.scrollTop = anchor.offsetTop - 100;
        }
      } else {
        this.$refs.content.appendChild(this.viewer.element);
        if (this.textFragment) {
          this.viewer.search(this.textFragment);
        }
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

  /* Bootstrap sets all box-sizing to border-box, which messes up the pdf-js library */
  ::v-deep(.page) {
    box-sizing: content-box !important;
  }

}
</style>
