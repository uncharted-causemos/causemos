<template>
  <div class="search-box">
    <auto-complete
      :display-type="'ConceptDisplay'"
      placeholder-message="Search Nodes..."
      :search-fn="searchNodes"
      @item-selected="emitSearchResult"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, toRefs } from 'vue';
import AutoComplete from '@/components/widgets/autocomplete/autocomplete.vue';

export default defineComponent({
  name: 'GraphSearch',
  emits: [
    'search'
  ],
  components: {
    AutoComplete
  },
  props: {
    nodes: {
      type: Array as PropType<any[]>,
      default: []
    }
  },
  setup(props, { emit }) {
    const {
      nodes
    } = toRefs(props);

    const emitSearchResult = (query: string) => {
      if (query) {
        const matches = nodes.value.filter((n) => {
          return n.label.toLowerCase() === query.toLowerCase();
        });
        if (matches.length > 0) {
          emit('search', matches[0].concept);
        }
      }
    };

    const searchNodes = (query: string) => {
      if (query.length < 1) return [];
      return nodes.value
        .map((n) => n.label)
        .filter((n) => n.toLowerCase().includes(query.toLowerCase()));
    };
    return {
      emitSearchResult,
      searchNodes
    };
  }
});
</script>

<style lang="scss" scoped>
.search-box {
  position: absolute;
  right: 5px;
  top: 5px;
}
</style>

