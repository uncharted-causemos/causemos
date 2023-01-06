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
import { mapActions, useStore } from 'vuex';
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
    const store = useStore();

    const view = store.getters['query/view'];

    const pageFrom = computed(() => store.getters['query/query'][view].from);
    const pageSize = computed(() => store.getters['query/query'][view].size);
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
    ...mapActions({
      setPagination: 'query/setPagination',
    }),
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
