<template>
  <div class="pagination-container">
    <button
      class="btn btn-sm btn-primary"
      :disabled="pageFrom === 0"
      @click="prev()"
    >Previous</button>
    <span class="pagination-label">{{ pageFrom+1 }} to {{ pageSizeCount }} of {{ numberFormatter(total) }} {{ label }}</span>
    <button
      class="btn btn-sm btn-primary"
      :disabled="total < incrementedPageLimit"
      @click="next()"
    >Next</button>
  </div>
</template>

<script>

import { mapActions, mapGetters } from 'vuex';
import numberFormatter from '@/formatters/number-formatter';

export default {
  name: 'Pagination',
  props: {
    label: {
      type: String,
      default: ''
    },
    total: {
      type: Number,
      default: 0
    }
  },
  computed: {
    ...mapGetters({
      view: 'query/view',
      query: 'query/query'
    }),
    pageFrom() {
      return this.query[this.view].from;
    },
    pageSize() {
      return this.query[this.view].size;
    },
    incrementedPageLimit: function() {
      return this.pageFrom + this.pageSize;
    },
    pageSizeCount: function() {
      return this.total < this.incrementedPageLimit ? this.total : this.incrementedPageLimit;
    }
  },
  methods: {
    ...mapActions({
      setPagination: 'query/setPagination'
    }),
    numberFormatter,
    prev() {
      this.setPagination({
        view: this.view,
        from: this.pageFrom - this.pageSize,
        size: this.pageSize
      });
    },
    next() {
      this.setPagination({
        view: this.view,
        from: this.pageFrom + this.pageSize,
        size: this.pageSize
      });
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/wm-theme/wm-theme";

.pagination-container {
  padding: 8px;
  span {
    padding: 16px;
  }
}
</style>
