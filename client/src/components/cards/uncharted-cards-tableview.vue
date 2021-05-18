<template>
  <div class="container-fluid">
    <div class="row container-row">
      <div class="col-md-1" />
      <div class="col-md-10 page-content">
        <div class="row">
          <hr>
        </div>
        <div class="row">
          <div class="controls">
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
            <pagination
              :label="'documents'"
              :total="documentsCount"
            />
          </div>
        </div>
        <div class="row cards-list">
          <div class="row cards-list-header">
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
          <div class="cards-list-elements">
            <div
              v-for="card in sortedData"
              :key="card.id">
              <tableview-card
                @rowcard-click="onRowCardClick"
                :card="card"/>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as _ from 'lodash';
import TableviewCard from '@/components/cards/tableview-card';
import DropdownControl from '@/components/dropdown-control';
import Pagination from '@/components/pagination';
import { mapGetters } from 'vuex';

const SORTING_OPTIONS = {
  MOST_RECENT: 'Most recent',
  EARLIEST: 'Earliest'
};

export default {
  name: 'UnchartedCardsTableview',
  components: {
    TableviewCard,
    DropdownControl,
    Pagination
  },
  props: {
    data: {
      type: Array,
      default: () => []
    }
  },
  data: () => ({
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
    sortedData() {
      if (this.selectedSortingOption === SORTING_OPTIONS.MOST_RECENT) {
        return _.orderBy(this.data, ['metadata.Publication'], ['desc']);
      } else if (this.selectedSortingOption === SORTING_OPTIONS.EARLIEST) {
        return _.orderBy(this.data, ['metadata.Publication'], ['asc']);
      } else {
        return this.data;
      }
    }
  },
  methods: {
    sortRows(option) {
      this.selectedSortingOption = option;
      this.showSortingDropdown = false;
    },
    toggleSortingDropdown() {
      this.showSortingDropdown = !this.showSortingDropdown;
    },
    onRowCardClick(targetData) {
      console.log(`FROM ROWCLICK: ${JSON.stringify(targetData)}`);
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

  .cards-list {
    box-sizing: border-box;
    height: 100%;
    width: 100%;
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    margin-bottom: 20px;
    .cards-list-header {
      box-sizing: border-box;
      border: 1px solid #bbb;
      margin: 1px 0;
      background: #fcfcfc;
      font-weight: bold;
      padding: 10px;
    }
    .cards-list-elements {
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
