<template>
  <div class="multi-relationships-container">
    <div class="bulk-actions">
      <i
        class="fa fa-lg fa-fw"
        :class="{
          'fa-check-square-o': summaryData.meta.checked,
          'fa-square-o': !summaryData.meta.checked && !summaryData.isSomeChildChecked,
          'fa-minus-square-o': !summaryData.meta.checked && summaryData.meta.isSomeChildChecked
        }"
        @click="toggle(summaryData)"
      />
      <button
        v-tooltip.top-center="'Add to CAG'"
        type="button"
        class="btn btn-sm btn-primary btn-call-for-action"
        @click="addToCAG"
      >
        <i class="fa fa-fw fa-plus-circle" />
        Add to CAG
      </button>
      <span class="counter">{{ numberFormatter(numselectedRelationships) }} selected</span>
    </div>
    <div class="relationships-list">
      <div
        v-for="(relationship, idx) in summaryData.children"
        :key="idx"
        class="relationships-item"
        :class="{ 'disabled': relationship.meta.style.disabled, '': !relationship.meta.style.disabled }"
      >
        <i
          class="fa fa-lg fa-fw"
          :class="{ 'fa-check-square-o': relationship.meta.checked, 'fa-square-o': !relationship.meta.checked }"
          @click.stop="toggle(relationship)" />
        <span @click="handleClick(relationship)"> {{ ontologyFormatter(relationship.source) }}
          <i
            class="fa fa-fw  fa-long-arrow-right"
            :style="relationship.meta.style"
          />
          {{ ontologyFormatter(relationship.target) }} </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { defineComponent, PropType, ref } from 'vue';
import { mapActions } from 'vuex';

import { calcEdgeColor } from '@/utils/scales-util';
import numberFormatter from '@/formatters/number-formatter';

interface RelationEdge {
  source: string;
  target: string;
  belief_score: number;
}

type SummaryData = {
  children: (RelationEdge & { meta: any })[];
  meta: any;
};


export default defineComponent({
  name: 'MultiRelationshipsPane',
  components: {
  },
  props: {
    relationships: {
      type: Array as PropType<RelationEdge[]>,
      default: () => []
    },
    graphData: {
      type: Object,
      default: () => ({ })
    }
  },
  setup() {
    const summaryData = ref<SummaryData>({ children: [], meta: { checked: false } });

    return {
      summaryData
    };
  },
  computed: {
    numselectedRelationships() {
      let cnt = 0;
      this.summaryData.children.forEach(relationship => {
        if (relationship.meta.checked) {
          cnt++;
        }
      });
      return cnt;
    }
  },
  watch: {
    relationships(n, o) {
      if (_.isEqual(n, o)) return;
      this.refresh();
    },
    graphData() {
      this.refresh();
    }
  },
  mounted() {
    this.refresh();
  },
  methods: {
    ...mapActions({
      setSelectedSubgraphEdges: 'graph/setSelectedSubgraphEdges'
    }),
    numberFormatter,
    refresh() {
      // Massage the structure to include checked states and styles
      let children = this.relationships.map(relationship => Object.assign({}, relationship, {
        meta: {
          checked: true,
          style: {
            color: calcEdgeColor(relationship),
            disabled: this.isEdgeinCAG({ source: relationship.source, target: relationship.target })
          }
        }
      }));

      children = _.orderBy(children, d => d.belief_score, ['desc']);

      this.summaryData = {
        children,
        meta: { checked: true, isSomeChildChecked: false }
      };
    },
    updateSelectedSubgraphEdges() {
      const edges: RelationEdge[] = [];
      this.summaryData.children.forEach(relationship => {
        if (relationship.meta.checked === true) {
          edges.push(relationship);
        }
      });
      this.setSelectedSubgraphEdges(edges);
    },
    toggle(item: any) {
      // Recursive helpers
      const recursiveDown = (item: any, newState: any) => {
        item.meta.checked = newState;
        if (!item.children) return;
        item.children.forEach((child: any) => recursiveDown(child, newState));
      };

      const recursiveUp = (item: any) => {
        if (!_.isEmpty(item.children)) {
          item.children.forEach((child: any) => recursiveUp(child));
          const numChecked = item.children.filter((d: any) => d.meta.checked || d.meta.isSomeChildChecked).length;
          item.meta.checked = numChecked === item.children.length;
          item.meta.isSomeChildChecked = numChecked > 0;
        }
      };

      // Toggle on if not currently checked and no children are partially or fully checked
      //  otherwise toggle off
      item.meta.checked = !item.meta.isSomeChildChecked && !item.meta.checked;

      // Traverse down to change children, then traverse up to update parents
      recursiveDown(item, item.meta.checked);
      recursiveUp(this.summaryData);

      this.updateSelectedSubgraphEdges();
    },
    isEdgeinCAG(edge: { source: string; target: string }) {
      if (_.isEmpty(this.graphData)) return;
      const graphData = this.graphData;
      const edges = graphData.edges.map((edge : any) => edge.source + '///' + edge.target);
      return edges.indexOf(edge.source + '///' + edge.target) !== -1;
    },
    addToCAG() {
      this.updateSelectedSubgraphEdges();
      this.$emit('add-to-CAG');
    },
    handleClick(edge: RelationEdge) {
      this.$emit('select-edge', edge);
    }
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';
.counter {
  padding: 5px;
}
.relationships-list {
  padding: 3px 0;
  list-style: none;
  span {
    cursor: pointer;
  }
  span:hover {
    text-decoration: underline;
  }
}

.relationships-item {
  margin-bottom: 2px;
  padding: 2px 0;
}

.bulk-actions {
  padding: 5px 0;
  border-bottom: 1px solid $separator;

  & > * {
    margin-right: 5px;
  }
}
</style>
