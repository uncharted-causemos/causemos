<template>
  <div class="documents-list-tableview-container">
    <modal-document
      v-if="!!documentModalData"
      :document-id="documentModalData.doc_id"
      @close="documentModalData = null"
    />
    <div class="document-list">
      <div class="document-list-header">
        <div style="flex: 4;">
          Title
        </div>
        <div style="flex: 2;">
          Publication Date
        </div>
        <div style="flex: 3;">
          Author
        </div>
        <div style="flex: 3;">
          Publisher
        </div>
      </div>
        <div v-if="sortedDocuments.length > 0" class="document-list-elements">
          <div
            v-for="documentMeta in sortedDocuments"
            :key="documentMeta.id">
            <documents-list-item
              @document-click="onDocumentClick"
              :documentMeta="documentMeta"/>
          </div>
        </div>
        <message-display
          v-else
          message="Sorry, no results were found"
        />
        <pagination
          v-if="sortedDocuments.length > 0"
          :label="'documents'"
          :total="documentsCount"
        />
    </div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { defineComponent } from 'vue';
import { mapGetters } from 'vuex';
import DocumentsListItem from '@/components/kb-explorer/documents-list-item.vue';
import Pagination from '@/components/pagination.vue';
import ModalDocument from '@/components/modals/modal-document.vue';
import MessageDisplay from '@/components/widgets/message-display.vue';

export default defineComponent({
  name: 'DocumentsListTableview',
  components: {
    DocumentsListItem,
    Pagination,
    ModalDocument,
    MessageDisplay
  },
  props: {
    documentData: {
      type: Array,
      default: () => []
    }
  },
  data: () => ({
    documentModalData: null as any
  }),
  computed: {
    ...mapGetters({
      filters: 'query/filters',
      documentsQuery: 'query/documents',
      project: 'app/project',
      documentsCount: 'kb/documentsCount'
    }),
    sortedDocuments(): any {
      return _.orderBy(this.documentData, ['publication_date.date'], ['desc']);
    }
  },
  methods: {
    formatMeta(data: { [key: string]: any }) {
      const metaDocument = {
        doc_id: data.id
      };
      return metaDocument;
    },
    onDocumentClick(targetData: { [key: string]: any }) {
      this.documentModalData = this.formatMeta(targetData.docmeta);
    }
  }
});
</script>

<style scoped lang="scss">
  @import '~styles/variables';

  .documents-list-tableview-container {
    width: 100%;
    height: 100%;
  }

  .document-list {
    box-sizing: border-box;
    height: 100%;
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    margin-bottom: 20px;
    border-top: 1px solid #e3e3e3;
    padding-top: 5px;

    .document-list-header {
      box-sizing: border-box;
      border: 1px solid #bbb;
      margin: 1px 0;
      background: #fcfcfc;
      font-weight: bold;
      padding: 10px;
      display: flex;
    }
    .document-list-elements {
      box-sizing: border-box;
      height: 100%;
      width: 100%;
      flex: 1;
      min-height: 0;
      overflow-y: scroll;
      overflow-x: hidden;
    }
  }

  .controls {
    display: flex;
    padding-bottom: 5px;
    margin-top: 5px;
    input[type=text] {
      padding: 8px;
      width: 250px;
      margin-right: 10px;
    }
    .form-control {
      background: #fff;
    }
  }
</style>
