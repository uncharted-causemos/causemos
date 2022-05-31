<template>
  <modal
    class="modal-document-container"
    @close="close()">
    <template #body>
      <div class="metadata">
        <table style="border-bottom: 1px solid #e3e3e3;" v-if="documentData">
          <tr>
            <td class="doc-label">Publication Date</td>
            <td>{{ dateFormatter(documentData.publication_date.date, 'YYYY-MM-DD') }}</td>
          </tr>
          <tr>
            <td class="doc-label">Publisher</td>
            <td v-if="!editable" class="doc-value">{{ publisher }}</td>
            <td v-else class="doc-value">
              <input v-model="publisher" />
            </td>
          </tr>
          <tr>
            <td class="doc-label">Author</td>
            <td v-if="!editable" class="doc-value">{{ author }}</td>
            <td v-else class="doc-value">
              <input v-model="author" />
            </td>
          </tr>
          <tr>
            <td class="doc-label">Title</td>
            <td v-if="!editable" class="doc-value">{{ title }}</td>
            <td v-else class="doc-value">
              <input v-model="title" />
            </td>
          </tr>
        </table>
      </div>
      <div v-if="pdfViewer"
        class="toolbar">
        Show raw text
        <i v-if="showTextViewer === false" class="fa fa-lg fa-fw fa-toggle-off" @click="toggle" />
        <i v-if="showTextViewer === true" class="fa fa-lg fa-fw fa-toggle-on" @click="toggle" />
      </div>
      <div ref="content">
        Loading...
      </div>
    </template>
    <template #footer>
        <button
          v-if="!editable"
          class="btn btn-md btn-secondary"
          @click="edit()"
        ><i class="fa fa-fw fa-edit" /> Edit</button>
        <button
          v-if="editable"
          class="btn btn-md btn-secondary"
          @click="save()"
        ><i class="fa fa-fw fa-save" />Save</button>
        <div class="spacer"></div>
        <button
          v-if="editable"
          class="btn btn-md btn-secondary"
          @click="cancel()"
        >Cancel</button>
        <button
          class="btn btn-md btn-primary"
          @click="close()"
        >Close</button>
        <button
          v-if="$route.name === 'kbExplorer'"
          class="btn btn-md btn-primary"
          @click="addToSearch()"
        >Add to search</button>
    </template>
  </modal>
</template>

<script>
import Modal from '@/components/modals/modal';
import { mapActions } from 'vuex';
import { createPDFViewer } from '@/utils/pdf/viewer';
import { removeChildren } from '@/utils/dom-util';
import dateFormatter from '@/formatters/date-formatter';
import { getDocument, updateDocument } from '@/services/document-service';

const isPdf = (data) => {
  const fileType = data && data.file_type;
  return fileType === 'pdf' || fileType === 'application/pdf';
};

const reformat = (v) => {
  return `<span class='extract-text-anchor' style='background: #56b3e9'>${v}</span>`;
};

// Run through a list of inexpensive, sucessive transforms to try to find the correct match
const lossySearch = (text, textFragment) => {
  let fragment = textFragment;

  const replacementElements = [
    [' .', '.'],
    [' ;', ';'],
    [' ,', ','],
    [' )', ')'],
    ['( ', '(']
  ];

  for (let i = 0; i < replacementElements.length; i++) {
    fragment = fragment.replaceAll(...replacementElements[i]);
    if (text.indexOf(fragment) >= 0) return text.replace(fragment, reformat(fragment));
  }

  return text;
};

// gradually loosen search requirements of a "regex and select punctuation"-sanitized
// search string by progressively adding regex wildcards to account for skipped
// characters, words and phrases in the text fragment being searched for.
const iterativeRegexSearch = (text, fragment) => {
  let sanitizedSearch = fragment
    // remove some special characters, may need adjustment for edge cases but some are regex reserved
    .replace(/[/\\[\].+*?^$(){}|,]/g, '')
    .split(/\s+/)
    .join(' ')
    .trim();
  const spaceTotal = sanitizedSearch.split(' ').length;
  let count = 0;
  while (count <= spaceTotal) {
    const searchRegEx = new RegExp(sanitizedSearch);
    const searchIndex = text.search(searchRegEx);
    if (searchIndex > -1) {
      return text.replace(searchRegEx, reformat(fragment));
    }
    sanitizedSearch = sanitizedSearch.replace(' ', '\\b.*?\\b');
    count++;
  }
  return text;
};

const createTextViewer = (text) => {
  const el = document.createElement('div');
  const originalText = text;

  function search(textFragment) {
    let t = originalText;
    if (textFragment) {
      if (text.indexOf(textFragment) >= 0) {
        t = t.replace(textFragment, reformat(textFragment));
      } else {
        t = lossySearch(t, textFragment);
      }
      // if all else fails, do this expensive regex search
      if (t === text) {
        t = iterativeRegexSearch(t, textFragment);
      }
      el.innerHTML = t;
      const anchor = document.getElementsByClassName('extract-text-anchor')[0];
      if (anchor) {
        const scroller = document.getElementsByClassName('modal-body')[0];
        scroller.scrollTop = anchor.offsetTop - 100;
      }
    }
  }

  el.innerHTML = originalText;
  el.style.paddingTop = '30px';
  el.style.paddingLeft = '15px';
  el.style.paddingRight = '15px';
  el.style.paddingBottom = '15px';

  return {
    search,
    element: el
  };
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
    pdfViewer: null,
    textOnly: false,
    showTextViewer: false,
    editable: false,
    author: '',
    publisher: '',
    title: ''
  }),
  mounted() {
    this.refresh();
  },
  methods: {
    ...mapActions({
      addSearchTerm: 'query/addSearchTerm'
    }),
    dateFormatter,
    refresh() {
      this.fetchReaderContent();
    },
    async fetchReaderContent() {
      this.documentData = (await getDocument(this.documentId)).data;
      this.setFieldsFromDocumentData();
      this.textViewer = createTextViewer(this.documentData.extracted_text);

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

      removeChildren(this.$refs.content);
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
        term: this.documentId
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
    edit() {
      // scroll up to edit zone;
      const anchor = document.getElementsByClassName('modal-body')[0];
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
        publisherName: this.publisher
      };
      await updateDocument(updatedData);
      this.refresh();
    }
  }
};
</script>

<style lang="scss" scoped>
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

    .modal-header{
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
    }
  }
  .toolbar {
    padding: 5px;
  }

  /* Bootstrap sets all box-sizing to border-box, which messes up the pdf-js library */
  :deep(.page) {
    box-sizing: content-box !important;
  }

}
</style>
