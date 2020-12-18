<template>
  <div class="node-suggestions-container">
    <div class="pane-summary">
      {{ selectedNode.concept | ontology-formatter }}
    </div>
    <div class="pane-controls">
      <div class=" bulk-actions">
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
        <span
          v-if="numselectedRelationships > 0"
          class="suggestions-counter">{{ numselectedRelationships }}  relationship(s)</span>
        <div
          v-if="numselectedRelationships === 0 && hasError"
          class="error-msg "> {{ errorMsg }} </div>
      </div>
    </div>
    <hr class="pane-separator">
    <div v-if="!isFetchingStatements">
      <div
        v-for="relationshipGroup in summaryData.children"
        :key="relationshipGroup.key"
        class="suggestions-group"
      >
        <span
          slot="title"
          class="suggestions-title"
        >
          <span v-if="relationshipGroup.key === 'cause'">
            Top 5 Drivers ( ? <i
              class="fa fa-fw  fa-long-arrow-right"
            />
            {{ selectedNode.concept | ontology-formatter }} )
          </span>
          <span v-else>
            Top 5 Impacts ({{ selectedNode.concept | ontology-formatter }} <i
              class="fa fa-fw  fa-long-arrow-right"
            />
            ?)
          </span>

        </span>
        <div
          v-if="relationshipGroup.children.length > 0"
          slot="content">
          <div class="suggestions-list">
            <div
              v-for="relationship in relationshipGroup.children"
              :key="relationship.key"
              class="suggestions-item"
              :class="{ 'disabled': relationship.meta.disabled, '': !relationship.meta.disabled }"
            >
              <i
                class="fa fa-lg fa-fw"
                :class="{ 'fa-check-square-o': relationship.meta.checked, 'fa-square-o': !relationship.meta.checked }"
                @click.stop="toggle(relationship)" />
              <span
                :style="relationship.meta.style"
              >{{ filterRedundantConcept(relationshipGroup.key, relationship.meta) | ontology-formatter }}
              </span>
            </div>
            <button
              type="button"
              class="btn btn-link"
              @click="openKBExplorer(relationshipGroup.key)"
            >            <i class="fa fa-fw fa-search" />
              Explore All ({{ relationshipGroup.count }})</button>
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="isFetchingStatements"
      class="pane-loading-message"
    >
      <i class="fa fa-spin fa-spinner pane-loading-icon" /><span>{{ loadingMessage }}</span>
    </div>
  </div>
</template>

<script>
import _ from 'lodash';
import { mapGetters, mapActions } from 'vuex';

import aggregationsUtil from '@/utils/aggregations-util';
import { STATEMENT_POLARITY } from '@/utils/polarity-util';
import { calcEdgeColor } from '@/utils/scales-util';
import { conceptShortName } from '@/utils/concept-util';

const RELATIONSHIP_GROUP_KEY = {
  CAUSE: 'cause',
  EFFECT: 'effect'
};

const MSG_EMPTY_SELECTION = 'There are no selected relationships';

export default {
  name: 'NodeSuggestionsPane',
  filters: {
    getRelationshipGroupDisplayString(relationshipGroupKey) {
      return relationshipGroupKey === RELATIONSHIP_GROUP_KEY.CAUSE
        ? 'Top 5 Drivers'
        : 'Top 5 Impacts';
    }
  },
  props: {
    selectedNode: {
      type: Object,
      default: null
    },
    statements: {
      type: Array,
      default: () => []
    },
    graphData: {
      type: Object,
      default: () => ({ })
    },
    isFetchingStatements: {
      type: Boolean,
      default: false
    }
  },
  data: () => ({
    summaryData: { children: [], meta: { checked: false, isSomeChildChecked: false } },
    hasError: false,
    errorMsg: MSG_EMPTY_SELECTION,
    loadingMessage: 'Loading suggestions...'
  }),
  computed: {
    ...mapGetters({
      currentCAG: 'app/currentCAG'
    }),
    numselectedRelationships() {
      let cnt = 0;
      this.summaryData.children.forEach(resourceGroup => {
        cnt += resourceGroup.children.filter(d => d.meta.checked === true).length;
      });
      return cnt;
    }
  },
  watch: {
    statements(n, o) {
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
      setSearchClause: 'query/setSearchClause'
    }),
    refresh() {
      const topic = this.selectedNode.concept;

      const causeStatement = this.statements.filter(s => s.obj.concept === topic);
      const effectStatement = this.statements.filter(s => s.subj.concept === topic);

      const causes = this.groupRelationships(causeStatement);
      const slicedCauses = causes.slice(0, 5); // Get top 5
      const effects = this.groupRelationships(effectStatement);
      const slicedEffects = effects.slice(0, 5); // Get top 5

      // Massage the structure a bit to fit into the common aggregated schema
      this.summaryData = {
        children: [
          {
            key: RELATIONSHIP_GROUP_KEY.CAUSE,
            count: causes.length,
            children: slicedCauses,
            meta: { checked: false }
          },
          {
            key: RELATIONSHIP_GROUP_KEY.EFFECT,
            count: effects.length,
            children: slicedEffects,
            meta: { checked: false }
          }
        ],
        meta: { checked: false, isSomeChildChecked: false }
      };
    },
    groupRelationships(statements) {
      const group = aggregationsUtil.groupDataArray(statements, [
        // 1. Group by subj.concept and obj.concept (edge precomputes this)
        {
          keyFn: (s) => s.wm.edge,
          sortFn: (s) => {
            // Sort by total number of evidence
            return -s.meta.num_evidence;
          },
          metaFn: (s) => {
            const splitted = s.key.split('///');
            const meta = {};
            meta.checked = false;
            meta.cause = splitted[0];
            meta.effect = splitted[1];
            meta.num_evidence = _.sumBy(s.dataArray, d => {
              return d.wm.num_evidence;
            });
            meta.disabled = this.isEdgeinCAG({ source: splitted[0], target: splitted[1] }); // Check if the relationship already exists in the CAG
            return meta;
          }
        }
      ]);
      group.forEach(d => {
        const reducedStatements = d.dataArray.reduce((accumulator, s) => {
          const wm = s.wm;
          const p = wm.statement_polarity;

          accumulator.belief_score += s.belief;
          accumulator.same += p === STATEMENT_POLARITY.SAME ? 1 : 0;
          accumulator.opposite += p === STATEMENT_POLARITY.OPPOSITE ? 1 : 0;
          accumulator.unknown += p === STATEMENT_POLARITY.UNKNOWN ? 1 : 0;
          return accumulator;
        }, { same: 0, opposite: 0, unknown: 0, belief_score: 0 });
        reducedStatements.belief_score = reducedStatements.belief_score / d.dataArray.length;
        d.meta.style = { color: calcEdgeColor(reducedStatements) };
      });
      return group;
    },
    toggle(item) {
      // Recursive helpers
      const recursiveDown = (item, newState) => {
        item.meta.checked = newState;
        if (!item.children) return;
        item.children.forEach(child => recursiveDown(child, newState));
      };

      const recursiveUp = (item) => {
        if (!_.isEmpty(item.children)) {
          item.children.forEach(child => recursiveUp(child));
          const numChecked = item.children.filter(d => d.meta.checked === true).length;
          const numPartiallyChecked = item.children.filter(d => d.meta.isSomeChildChecked).length;
          item.meta.isSomeChildChecked = numChecked > 0 || numPartiallyChecked > 0;
          item.meta.checked = numChecked === item.children.length;
        }
      };

      // Toggle on if not currently checked and no children are partially or fully checked
      //  otherwise toggle off
      item.meta.checked = !item.meta.isSomeChildChecked && !item.meta.checked;

      // Traverse down to change children, then traverse up to update parents
      recursiveDown(item, item.meta.checked);
      recursiveUp(this.summaryData);
    },
    filterRedundantConcept(relationshipGroupKey, relationship) {
      return relationshipGroupKey === RELATIONSHIP_GROUP_KEY.CAUSE
        ? relationship.cause
        : relationship.effect;
    },
    openKBExplorer(relationshipGroupKey) {
      const selectedNode = this.selectedNode.concept;

      if (relationshipGroupKey === RELATIONSHIP_GROUP_KEY.CAUSE) {
        this.$router.push({ name: 'kbExplorer', query: { cag: this.currentCAG, view: 'graphs' } });
        this.setSearchClause({ field: 'objConcept', operand: 'or', isNot: false, values: [selectedNode] });
      } else {
        this.$router.push({ name: 'kbExplorer', query: { cag: this.currentCAG, view: 'graphs' } });
        this.setSearchClause({ field: 'subjConcept', operand: 'or', isNot: false, values: [selectedNode] });
      }
    },
    isEdgeinCAG(edge) {
      const graphData = this.graphData;
      const edges = graphData.edges.map(edge => edge.source + '///' + edge.target);
      return edges.indexOf(edge.source + '///' + edge.target) !== -1;
    },
    addToCAG() {
      if (this.numselectedRelationships > 0) {
        this.hasError = false;

        const causeGroup = this.summaryData.children[0];
        const effectGroup = this.summaryData.children[1];

        let causeNodes = [];
        const causeEdges = [];
        let effectNodes = [];
        const effectEdges = [];

        // Cause edges
        if (!_.isEmpty(causeGroup.children)) {
          // Get selected edges
          causeGroup.children.forEach(edge => {
            if (edge.meta.checked) {
              const referenceIds = edge.dataArray.map(statement => statement.id);
              causeEdges.push({ source: edge.meta.cause, target: edge.meta.effect, reference_ids: referenceIds });
            }
          });
          // Check existing nodes in the CAG. We don't need to check existing edges because we don't allow to add existing edges from the list.
          const nodes = _.flatten(causeEdges.map(edge => [{ concept: edge.source, label: conceptShortName(edge.source) }, { concept: edge.target, label: conceptShortName(edge.target) }]));
          causeNodes = _.differenceWith(nodes, this.graphData.nodes, (selected, current) => {
            return selected.concept === current.concept;
          });
        }

        // Effect edges
        if (!_.isEmpty(effectGroup.children)) {
          effectGroup.children.forEach(edge => {
            if (edge.meta.checked) {
              const referenceIds = edge.dataArray.map(statement => statement.id);
              effectEdges.push({ source: edge.meta.cause, target: edge.meta.effect, reference_ids: referenceIds });
            }
          });

          // Check existing nodes in the CAG
          const nodes = _.flatten(effectEdges.map(edge => [{ concept: edge.source, label: conceptShortName(edge.source) }, { concept: edge.target, label: conceptShortName(edge.target) }]));
          effectNodes = _.differenceWith(nodes, this.graphData.nodes, (selected, current) => {
            return selected.concept === current.concept;
          });
        }

        const nodesToAdd = _.uniqBy(causeNodes.concat(effectNodes), 'concept'); // Remove duplicated nodes
        const edgesToAdd = causeEdges.concat(effectEdges);

        this.$emit('add-to-CAG', { nodes: nodesToAdd, edges: edgesToAdd });
      } else {
        this.hasError = true;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import '~styles/variables';


.btn-link {
  color: $link-color;
}

.suggestions-counter {
  padding: 0 5px;
}

.suggestions-group {
  margin-top: 12px;
}

.suggestions-title {
  font-weight: 600;
  padding: 5px 5px;
}

.suggestions-list {
  padding: 8px 0;
  list-style: none;
  span {
    padding-left: 18px;
  }
}

.suggestions-item {
  margin-bottom: 2px;
  padding: 2px 0;
}

</style>
