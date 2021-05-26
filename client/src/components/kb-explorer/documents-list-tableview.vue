<template>
  <div class="container-fluid">
    <modal-document
      v-if="!!documentModalData"
      :document-data="documentModalData"
      @close="documentModalData = null"
    />
    <div class="row container-row">
      <div class="col-md-1" />
      <div class="col-md-10 page-content">
        <div class="row">
          <hr>
        </div>
        <div class="row">
          <pagination
            class="col-md-8"
            :label="'documents'"
            :total="documentsCount"
          />
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
              Organization
            </div>
          </div>
          <div class="document-list-elements">
            <div
              v-for="documentMeta in sortedDocuments"
              :key="documentMeta.id">
              <documents-list-item
                @document-click="onDocumentClick"
                :documentMeta="documentMeta"/>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as _ from 'lodash';
import DocumentsListItem from '@/components/kb-explorer/documents-list-item';
import DropdownControl from '@/components/dropdown-control';
import Pagination from '@/components/pagination';
import ModalDocument from '@/components/modals/modal-document';
import { mapGetters } from 'vuex';

const SORTING_OPTIONS = {
  MOST_RECENT: 'Most recent',
  EARLIEST: 'Earliest'
};

export default {
  name: 'UnchartedCardsTableview',
  components: {
    DocumentsListItem,
    DropdownControl,
    Pagination,
    ModalDocument
  },
  props: {
    documentData: {
      type: Array,
      default: () => []
    }
  },
  data: () => ({
    documentModalData: null,
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
    pageFrom() {
      return this.documentsQuery.from;
    },
    pageSize() {
      return this.documentsQuery.size;
    },
    sort() {
      return this.documentsQuery.sort;
    },
    sortedDocuments() {
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
    formatMeta(data) {
      if (data) {
        const metaDocument = {
          doc_id: data.id,
          title: data.title
        };
        return metaDocument;
      }
      return null;
    },
    sortRows(option) {
      this.selectedSortingOption = option;
      this.showSortingDropdown = false;
    },
    toggleSortingDropdown() {
      this.showSortingDropdown = !this.showSortingDropdown;
    },
    onDocumentClick(targetData) {
      this.documentModalData = this.formatMeta(targetData.docmeta);
    }
  }
};
</script>

<style scoped lang="scss">
  @import '~styles/variables';

  .container-fluid {
    width: 100%;
    height: 100%;
  }

  .container-row {
    width: 100%;
    height: 100%;
    padding-bottom: 80px;
  }

  .page-content {
    width: 100%;
    height: 100%;
  }

  .document-list {
    box-sizing: border-box;
    height: 100%;
    width: 100%;
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
