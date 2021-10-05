<template>
  <div class="search-box">
    <input
      v-model="search"
      type="text"
      class="form-control"
      placeholder="Search Nodes..."
      @keyup.enter="searchNodes"
      @dblclick.stop=""
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref, toRefs } from 'vue';

export default defineComponent({
  name: 'GraphSearch',
  emits: [
    'search'
  ],
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

    const search = ref('');
    const searchNodes = () => {
      const matches = nodes.value.filter((n) => {
        return n.label.toLowerCase() === search.value.toLowerCase();
      });
      if (matches.length > 0) {
        emit('search', matches[0].concept);
      }
    };
    return {
      search,
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

