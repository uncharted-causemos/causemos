<template>
  <div class="search-box">
    <input placeholder="Search..." v-model="searchStr" class="graph-search" type="text" />
    <i
      v-if="searchStr.length > 1"
      class="fa fa-window-close fa-fw fa-lg"
      style="margin-left: -25px; cursor: pointer"
      @click="searchStr = ''"
    />

    <dropdown-control v-if="searchStr.length > 1" class="search-dropdown">
      <template #content>
        <div
          class="search-dropdown-item"
          v-for="c of candidates"
          :key="c"
          @dblclick.stop=""
          @click.stop="moveTo(c)"
        >
          <div>{{ ontologyFormatter(c) }}</div>
        </div>
      </template>
    </dropdown-control>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, toRefs, ref, watch } from 'vue';
import DropdownControl from '@/components/dropdown-control.vue';
import useOntologyFormatter from '@/composables/useOntologyFormatter';

export default defineComponent({
  name: 'GraphSearch',
  emits: ['search', 'search-candidates'],
  components: {
    DropdownControl,
  },
  props: {
    nodes: {
      type: Array as PropType<any[]>,
      default: [],
    },
  },
  setup(props, { emit }) {
    const { nodes } = toRefs(props);

    const searchStr = ref('');
    const candidates = ref<string[]>([]);

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

    watch(
      () => [searchStr.value],
      () => {
        if (searchStr.value.length < 2) {
          emit('search-candidates', []);
          candidates.value = [];
          return;
        }

        const matches = nodes.value
          .filter((n) => n.label.toLowerCase().includes(searchStr.value.toLowerCase()))
          .map((n) => n.concept);

        emit('search-candidates', matches);
        candidates.value = matches;
      },
      { immediate: true }
    );

    return {
      searchStr,
      emitSearchResult,
      candidates,
      ontologyFormatter: useOntologyFormatter(),
    };
  },
  methods: {
    moveTo(label: string) {
      this.$emit('search', label);
    },
  },
});
</script>

<style lang="scss" scoped>
.search-box {
  position: absolute;
  right: 25px;
  top: 5px;

  .graph-search {
    padding-right: 20px;
    border: 1px solid #ccc;
    background: #eee;
    height: 30px;
  }

  .search-dropdown {
    position: absolute;
    top: 35px;
    left: -100px;
    opacity: 0.9;
  }

  .search-dropdown-item {
    padding: 10px 5px;
    width: 270px;
    height: 30px;
    opacity: 0.75;
    display: flex;
    align-items: center;
  }

  .search-dropdown-item:hover {
    background: #fd0;
    cursor: pointer;
  }

  .search-dropdown-item:not(:last-child) {
    border-bottom: 1px solid #888;
  }
}
</style>
