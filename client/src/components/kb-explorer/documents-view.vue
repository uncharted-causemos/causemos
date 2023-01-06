<template>
  <div class="document-view-container h-100 flex flex-col">
    <documents-list-tableview :documentData="documentData" />
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { defineComponent } from 'vue';
import { mapActions, mapGetters } from 'vuex';
import API from '@/api/api';
import filtersUtil from '@/utils/filters-util';
import DocumentsListTableview from '@/components/kb-explorer/documents-list-tableview.vue';

export default defineComponent({
  name: 'DocumentsView',
  components: {
    DocumentsListTableview,
  },
  data: () => ({
    documentData: [],
  }),
  computed: {
    ...mapGetters({
      filters: 'query/filters',
      documentsQuery: 'query/documents',
      project: 'app/project',
      documentsCount: 'kb/documentsCount',
    }),
    pageFrom(): number {
      return this.documentsQuery.from;
    },
    pageSize(): number {
      return this.documentsQuery.size;
    },
    sort(): { [key: string]: string } {
      return this.documentsQuery.sort;
    },
  },
  watch: {
    filters(n, o) {
      if (filtersUtil.isEqual(n, o)) return;
      this.refresh();
    },
    documentsQuery(n, o) {
      if (_.isEqual(n, o)) return;
      this.refresh();
    },
  },
  mounted() {
    this.refresh();
  },
  methods: {
    ...mapActions({
      enableOverlay: 'app/enableOverlay',
      disableOverlay: 'app/disableOverlay',
    }),
    refresh() {
      this.refreshData();
    },
    refreshData() {
      this.enableOverlay('Refreshing...');
      const url = `projects/${this.project}/documents/`;
      const params = {
        filters: this.filters,
        from: this.pageFrom,
        size: this.pageSize,
        sort: this.sort,
      };
      API.get(url, { params }).then((d) => {
        this.documentData = d.data;
        this.disableOverlay();
      });
    },
  },
});
</script>

<style scoped lang="scss">
.document-view-container {
  padding: 8px;
}
</style>
