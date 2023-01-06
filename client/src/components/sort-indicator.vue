<template>
  <span>
    <i v-if="currentSort === null" class="fa fa-fw fa-sort" @click="changeSort('asc')" />
    <i v-if="currentSort === 'asc'" class="fa fa-fw fa-sort-asc" @click="changeSort('desc')" />
    <i v-if="currentSort === 'desc'" class="fa fa-fw fa-sort-desc" @click="changeSort('asc')" />
  </span>
</template>

<script lang="ts">
import _ from 'lodash';
import { defineComponent, computed, ref } from 'vue';
import { useStore } from 'vuex';

export default defineComponent({
  name: 'SortIndicator',
  props: {
    field: {
      type: String,
      default: null,
    },
  },
  setup(props) {
    const store = useStore();
    const sort = computed(() => {
      return store.getters['query/statements'].sort;
    });
    const view = computed(() => store.getters['query/view']);
    const currentSort = ref(null);

    return {
      sort,
      view,
      currentSort,

      changeSort: (order: string) => {
        store.dispatch('query/setOrderBy', {
          view: view.value,
          field: props.field,
          sortOrder: order,
        });
      },
    };
  },
  watch: {
    sort() {
      this.refresh();
    },
  },
  mounted() {
    this.refresh();
  },
  methods: {
    refresh() {
      if (_.isEmpty(this.sort) || !this.sort[this.field]) {
        this.currentSort = null;
      } else {
        this.currentSort = this.sort[this.field];
      }
    },
  },
});
</script>
