<template>
  <div class="container-fluid">
    <modal-document
      v-if="!!documentModalData"
      :document-id="documentModalData.doc_id"
      @close="documentModalData = null"
    />
    <div class="row container-row">
      <div class="col-md-1" />
      <div class="col-md-12 page-content">
        <div class="row">
          <hr>
        </div>
        <div class="row"
          v-if="showSortingOptions">
          <div class="controls col-md-2">
            <div class="sorting">
              <div>
                <button
                  type="button"
                  class="btn btn-default"
                  @click="toggleSortingDropdown">
                  <span class="lbl">Sort by</span> - {{ selectedSortingOption }}
                  <i class="fa fa-caret-down" />
                </button>
              </div>
              <div v-if="showSortingDropdown">
                <dropdown-control class="dropdown">
                  <template #content>
                    <div
                      v-for="option in sortingOptions"
                      :key="option"
                      class="dropdown-option"
                      @click="sortRows(option)">
                     {{ option }}
                    </div>
                  </template>
                </dropdown-control>
              </div>
            </div>
          </div>
        </div>
        <div class="row document-list">
          <div class="row document-list-header">
            <div class="col-sm-1">
            </div>
            <div class="col-sm-3">
              Title
            </div>
            <div class="col-sm-2">
              Publication Date
            </div>
            <div class="col-sm-3">
              Author
            </div>
            <div class="col-sm-3">
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
              class="col-md-8"
              :label="'documents'"
              :total="documentsCount"
            />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { defineComponent } from 'vue';
import { mapGetters } from 'vuex';
import DocumentsListItem from '@/components/kb-explorer/documents-list-item.vue';
import DropdownControl from '@/components/dropdown-control.vue';
import Pagination from '@/components/pagination.vue';
import ModalDocument from '@/components/modals/modal-document.vue';
import MessageDisplay from '@/components/widgets/message-display.vue';

const SORTING_OPTIONS = {
  MOST_RECENT: 'Most recent',
  EARLIEST: 'Earliest'
};

export default defineComponent({
  name: 'DocumentsListTableview',
  components: {
    DocumentsListItem,
    DropdownControl,
    Pagination,
    ModalDocument,
    MessageDisplay
  },
  props: {
    documentData: {
      type: Array,
      default: () => []
    },
    showSortingOptions: {
      type: Boolean,
      default: false
    }
  },
  data: () => ({
    documentModalData: null as any,
    showSortingDropdown: false,
    sortingOptions: [SORTING_OPTIONS.MOST_RECENT, SORTING_OPTIONS.EARLIEST],
    selectedSortingOption: SORTING_OPTIONS.MOST_RECENT
  }),
  computed: {
    ...mapGetters({
      filters: 'query/filters',
      documentsQuery: 'query/documents',
      project: 'app/project',
      documentsCount: 'kb/documentsCount'
    }),
    sortedDocuments(): any {
      if (this.selectedSortingOption === SORTING_OPTIONS.MOST_RECENT) {
        return _.orderBy(this.documentData, ['publication_date.date'], ['desc']);
      } else if (this.selectedSortingOption === SORTING_OPTIONS.EARLIEST) {
        return _.orderBy(this.documentData, ['publication_date.date'], ['asc']);
      } else {
        return this.documentData;
      }
    }
  },
  methods: {
    formatMeta(data: { [key: string]: any }) {
      const metaDocument = {
        doc_id: data.id
      };
      return metaDocument;
    },
    sortRows(option: any) {
      this.selectedSortingOption = option;
      this.showSortingDropdown = false;
    },
    toggleSortingDropdown() {
      this.showSortingDropdown = !this.showSortingDropdown;
    },
    onDocumentClick(targetData: { [key: string]: any }) {
      this.documentModalData = this.formatMeta(targetData.docmeta);
    }
  }
});
</script>

<style scoped lang="scss">
  @import '~styles/variables';

  .container-fluid {
    width: 100%;
    height: 100%;
    padding-right: 0;
  }

  .container-row {
    width: 100%;
    height: 100%;
    padding-bottom: 10px;
  }

  .page-content {
    width: 100%;
    height: 100%;
    padding-right: 0;
  }

  .document-list {
    box-sizing: border-box;
    height: 100%;
    width: 102%;
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    margin-bottom: 20px;
    .document-list-header {
      box-sizing: border-box;
      border: 1px solid #bbb;
      margin: 1px 0;
      background: #fcfcfc;
      font-weight: bold;
      padding: 10px;
    }
    .document-list-elements {
      box-sizing: border-box;
      height: 100%;
      width: 100%;
      flex: 1;
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
    .sorting {
      position: relative;
      .btn {
        width: 180px !important;
        text-align: left;
        .lbl {
          font-weight: normal;
        }
        .fa {
          position:absolute;
          right: 20px;
        }
      }
      .dropdown {
        position: absolute;
        width: 100%;
      }
    }
    .form-control {
      background: #fff;
    }
  }

  hr {
    margin: 5px;
  }
</style>
