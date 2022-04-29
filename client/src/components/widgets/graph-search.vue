<template>
  <div class="search-box">
    <auto-complete
      :display-type="'ConceptDisplay'"
      placeholder-message="Search..."
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
    'search', 'search-candidates'
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

    const emitSearchResult = (concept: string) => {
      if (concept) {
        const matches = nodes.value.filter((n) => {
          return n.concept === concept;
        });
        if (matches.length > 0) {
          emit('search', matches[0].concept);
        }
      }
    };

    const searchNodes = (query: string) => {
      if (query.length < 1) {
        emit('search-candidates', []);
        return [];
      }

      const candidates = nodes.value
        .filter((n) => n.label.toLowerCase().includes(query.toLowerCase()))
        .map(n => n.concept);

      emit('search-candidates', candidates);
      return candidates;
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

