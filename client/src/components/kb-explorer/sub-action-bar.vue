<template>
  <div class="action-bar">
    <!-- Actions for the table-->
    <div class="table-actions">
      <div v-if="view === 'statements'">
        <button type="button" class="btn btn-primary-outline" @click="toggleColumnSelector()">
          <i class="fa fa-columns" />
          <i class="fa fa-caret-down" />
          Columns
        </button>
        <statements-columns-selector v-if="showColumnSelector" />
      </div>
    </div>
    <!-- Actions shared across views-->
    <div class="shared-actions">
      <div>
        <button
          v-tooltip.top-center="'Add new document'"
          type="button"
          class="btn btn-normal-outline"
          @click="showDocumentModal = true"
        >
          Add Document
        </button>
      </div>
      <div>
        <button
          v-tooltip.top-center="'Toggle self-loops'"
          type="button"
          class="btn btn-primary-outline"
          @click="toggleSelfloop()"
        >
          <i
            class="fa"
            :class="{ 'fa-check-square-o': showSelfLoop, 'fa-square-o': !showSelfLoop }"
          />
          Self-loops
        </button>
      </div>
    </div>
    <modal-upload-document v-if="showDocumentModal === true" @close="showDocumentModal = false" />
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { defineComponent } from 'vue';
import { mapGetters, mapActions } from 'vuex';
import StatementsColumnsSelector from '@/components/kb-explorer/statements-columns-selector.vue';
import filtersUtil from '@/utils/filters-util';
import ModalUploadDocument from '@/components/modals/modal-upload-document.vue';

export default defineComponent({
  name: 'ActionBar',
  components: {
    StatementsColumnsSelector,
    ModalUploadDocument,
  },
  data: () => ({
    // Display toggles
    showModelDialog: false,
    showColumnSelector: false,
    showDocumentModal: false,
  }),
  computed: {
    ...mapGetters({
      // KB based states
      filters: 'query/filters',
      view: 'query/view',
    }),
    showSelfLoop: function () {
      const enable = filtersUtil.findPositiveFacetClause(this.filters, 'enable');
      if (_.isNil(enable) || enable.values.indexOf('self-loop') === -1) {
        return false;
      }
      return true;
    },
  },
  watch: {
    filters(n, o) {
      if (filtersUtil.isEqual(n, o)) return;
      this.refresh();
    },
    updateToken(n, o) {
      if (_.isEqual(n, o)) return;
      this.refresh();
    },
  },
  mounted() {
    this.refresh();
  },
  methods: {
    ...mapActions({
      addSearchTerm: 'query/addSearchTerm',
      removeSearchTerm: 'query/removeSearchTerm',
      setUpdateToken: 'app/setUpdateToken',
      setStagingStatementsCount: 'kb/setStagingStatementsCount',
      enableOverlay: 'app/enableOverlay',
      disableOverlay: 'app/disableOverlay',
    }),
    initializeData() {
      this.showColumnSelector = false;
    },
    refresh() {
      this.initializeData();
    },
    toggleColumnSelector() {
      this.showColumnSelector = !this.showColumnSelector;
    },
    toggleSelfloop() {
      if (this.showSelfLoop === false) {
        this.addSearchTerm({ field: 'enable', term: 'self-loop' });
      } else {
        this.removeSearchTerm({ field: 'enable', term: 'self-loop' });
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.action-bar {
  display: flex;
  width: 80%;
  box-sizing: border-box;
  .table-actions {
    display: flex;
    cursor: pointer;
    i {
      margin: 2px;
    }
  }
  .shared-actions {
    display: flex;
    flex-grow: 1;
    justify-content: flex-end;
    box-sizing: border-box;
    .btn {
      margin-right: 5px;
    }
    i {
      margin: 2px;
      cursor: pointer;
    }
  }
}

//For transparent buttons
.btn-primary-outline {
  background-color: transparent;
}
</style>
