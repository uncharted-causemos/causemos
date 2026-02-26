<template>
  <div class="pagination-container">
    <button class="btn btn-sm btn-primary" :disabled="pageFrom === 0" @click="prev()">
      Previous
    </button>
    <span class="pagination-label"
      >{{ pageFrom + 1 }} to {{ pageSizeCount }} of {{ numberFormatter(total) }} {{ label }}</span
    >
    <button class="btn btn-sm btn-primary" :disabled="total < incrementedPageLimit" @click="next()">
      Next
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, PropType } from 'vue';
import { mapActions } from 'pinia';
import { useQueryStore } from '@/stores/query-store';
import numberFormatter from '@/formatters/number-formatter';

export default defineComponent({
  name: 'Pagination',
  props: {
    label: {
      type: String,
      default: '',
    },
    total: {
      type: Number as PropType<number>,
      default: 0,
    },
  },
  setup(props) {
    const queryStore = useQueryStore();

    const view = queryStore.view;

    const pageFrom = computed(() => queryStore.query[view].from);
    const pageSize = computed(() => queryStore.query[view].size);
    const incrementedPageLimit = computed(() => pageFrom.value + pageSize.value);
    const pageSizeCount = computed(() =>
      props.total < incrementedPageLimit.value ? props.total : incrementedPageLimit.value
    );

    return {
      view,
      pageFrom,
      pageSize,
      incrementedPageLimit,
      pageSizeCount,
    };
  },
  methods: {
    ...mapActions(useQueryStore, ['setPagination']),
    numberFormatter,
    prev() {
      this.setPagination({
        view: this.view,
        from: this.pageFrom - this.pageSize,
        size: this.pageSize,
      });
    },
    next() {
      this.setPagination({
        view: this.view,
        from: this.pageFrom + this.pageSize,
        size: this.pageSize,
      });
    },
  },
});
</script>

<style lang="scss" scoped>
.pagination-container {
  padding: 8px;
  span {
    padding: 16px;
  }
}
</style>
