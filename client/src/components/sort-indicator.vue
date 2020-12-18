<template>
  <span>
    <i
      v-if="currentSort===null"
      class="fa fa-fw fa-sort"
      @click="changeSort('asc')"
    />
    <i
      v-if="currentSort==='asc'"
      class="fa fa-fw fa-sort-asc"
      @click="changeSort('desc')"
    />
    <i
      v-if="currentSort==='desc'"
      class="fa fa-fw fa-sort-desc"
      @click="changeSort('asc')"
    />
  </span>
</template>

<script>

import _ from 'lodash';
import { mapActions, mapGetters } from 'vuex';

export default {
  name: 'SortIndicator',
  props: {
    field: {
      type: String,
      default: null
    }
  },
  data: () => ({
    currentSort: null
  }),
  computed: {
    ...mapGetters({
      view: 'query/view',
      statementsQuery: 'query/statements'
    }),
    sort() {
      return this.statementsQuery.sort;
    }
  },
  watch: {
    sort() {
      this.refresh();
    }
  },
  mounted() {
    this.refresh();
  },
  methods: {
    ...mapActions({
      setOrderBy: 'query/setOrderBy'
    }),
    refresh() {
      if (_.isEmpty(this.sort) || !this.sort[this.field]) {
        this.currentSort = null;
      } else {
        this.currentSort = this.sort[this.field];
      }
    },
    changeSort(order) {
      this.setOrderBy({ view: this.view, field: this.field, sortOrder: order });
    }
  }
};
</script>
