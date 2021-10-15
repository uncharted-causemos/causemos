<template>
  <div class="node-suggestions-container">
    <div class="pane-summary">
      {{ ontologyFormatter(selectedNode.concept) }}
    </div>
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
      <span
        v-if="numselectedRelationships > 0"
        class="suggestions-counter">{{ numselectedRelationships }}  relationship(s)</span>
      <div
        v-if="numselectedRelationships === 0 && hasError"
        class="error-msg "> {{ errorMsg }} </div>
    </div>
    <div v-if="!isFetchingStatements">
      <div
        v-for="relationshipGroup in summaryData.children"
        :key="relationshipGroup.key"
        class="suggestions-group"
      >
        <span
          class="suggestions-title"
        >
          <span v-if="relationshipGroup.key === 'cause'">
            Drivers ( ? <i
              class="fa fa-fw  fa-long-arrow-right"
            />
            {{ ontologyFormatter(selectedNode.concept) }} )
          </span>
          <span v-else>
            Impacts ({{ ontologyFormatter(selectedNode.concept) }} <i
              class="fa fa-fw  fa-long-arrow-right"
            />
            ?)
          </span>

        </span>
        <div v-if="relationshipGroup.children.length > 0">
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
              <span :style="relationship.meta.style" >
                {{ ontologyFormatter(filterRedundantConcept(relationshipGroup.key, relationship.meta)) }}
                {{ relationship.meta.numEvidence }}
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
import filtersUtil from '@/utils/filters-util';

const RELATIONSHIP_GROUP_KEY = {
  CAUSE: 'cause',
  EFFECT: 'effect'
};

const MSG_EMPTY_SELECTION = 'There are no selected relationships';

// Extract edge attributes
const statementsToEdgeAttributes = (statements) => {
  const edgeAttributes = statements.reduce((accumulator, s) => {
    const wm = s.wm;
    const p = wm.statement_polarity;

    accumulator.belief_score += s.belief;
    accumulator.same += p === STATEMENT_POLARITY.SAME ? 1 : 0;
    accumulator.opposite += p === STATEMENT_POLARITY.OPPOSITE ? 1 : 0;
    accumulator.unknown += p === STATEMENT_POLARITY.UNKNOWN ? 1 : 0;
    return accumulator;
  }, { same: 0, opposite: 0, unknown: 0, belief_score: 0 });

  edgeAttributes.belief_score = edgeAttributes.belief_score / statements.length;
  return edgeAttributes;
};


export default {
  name: 'NodeSuggestionsPane',
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
  emits: [
    'add-to-CAG'
  ],
  data: () => ({
    summaryData: { children: [], meta: { checked: false, isSomeChildChecked: false } },
    hasError: false
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
  created() {
    this.errorMsg = MSG_EMPTY_SELECTION;
    this.loadingMessage = 'Loading suggestions...';
  },
  mounted() {
    this.refresh();
  },
  methods: {
    ...mapActions({
      setSearchClause: 'query/setSearchClause'
    }),
    refresh() {
      const graphData = this.graphData;
      const components = this.selectedNode.components;

      const causeStatements = this.statements.filter(s => components.includes(s.obj.concept));
      const effectStatements = this.statements.filter(s => components.includes(s.subj.concept));

      // Helper
      const addToMap = (map, key, val) => {
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key).push(val);
      };

      // Map to node-container level if applicable
      const causeMap = new Map();
      for (let i = 0; i < causeStatements.length; i++) {
        const statement = causeStatements[i];
        const nodeContainters = graphData.nodes.filter(n => n.components.includes(statement.subj.concept));
        if (nodeContainters.length === 0) {
          addToMap(causeMap, statement.subj.concept, statement);
          // if (!causeMap.has(statement.subj.concept)) {
          //   causeMap.set(statement.subj.concept, []);
          // }
          // causeMap.get(statement.subj.concept).push(statement);
        } else {
          for (let j = 0; j < nodeContainters.length; j++) {
            const causeConcept = nodeContainters[j].concept;
            if (_.some(graphData.edges, edge => edge.source === causeConcept && edge.target === this.selectedNode.concept)) {
              console.log('dupe', statement.subj.concept, statement.obj.concept);
              continue;
            }

            addToMap(causeMap, causeConcept, statement);
            // if (!causeMap.has(causeConcept)) {
            //   causeMap.set(causeConcept, []);
            // }
            // causeMap.get(causeConcept).push(statement);
          }
        }
      }

      // Map to node-container level if applicable
      const effectMap = new Map();
      for (let i = 0; i < effectStatements.length; i++) {
        const statement = effectStatements[i];
        const nodeContainters = graphData.nodes.filter(n => n.components.includes(statement.obj.concept));
        if (nodeContainters.length === 0) {
          addToMap(effectMap, statement.obj.concept, statement);
          // if (!effectMap.has(statement.obj.concept)) {
          //   effectMap.set(statement.obj.concept, []);
          // }
          // effectMap.get(statement.obj.concept).push(statement);
        } else {
          for (let j = 0; j < nodeContainters.length; j++) {
            const effectConcept = nodeContainters[j].concept;
            if (_.some(graphData.edges, edge => edge.source === this.selectedNode.concept && edge.target === effectConcept)) {
              console.log('dupe');
              continue;
            }
            addToMap(effectMap, effectConcept, statement);
            // if (!effectMap.has(effectConcept)) {
            //   effectMap.set(effectConcept, []);
            // }
            // effectMap.get(effectConcept).push(statement);
          }
        }
      }

      console.log('Cause', causeMap);
      const causeEntries = [...causeMap.entries()];
      const causeEdges = [];
      for (let i = 0; i < causeEntries.length; i++) {
        const [key, statements] = causeEntries[i];
        causeEdges.push({
          meta: {
            checked: false,
            source: key,
            target: this.selectedNode.concept,
            style: { color: calcEdgeColor(statementsToEdgeAttributes(statements)) },
            numEvidence: _.sumBy(statements, s => s.wm.num_evidence)
          },
          dataArray: statements
        });
      }

      console.log('Effect', effectMap);
      const effectEntries = [...effectMap.entries()];
      const effectEdges = [];
      for (let i = 0; i < effectEntries.length; i++) {
        const [key, statements] = effectEntries[i];
        effectEdges.push({
          meta: {
            checked: false,
            source: this.selectedNode.concept,
            target: key,
            style: { color: calcEdgeColor(statementsToEdgeAttributes(statements)) },
            numEvidence: _.sumBy(statements, s => s.wm.num_evidence)
          },
          dataArray: statements
        });
      }

      // Get "top" edges by number of evidence
      const topCauseEdges = _.take(
        causeEdges.sort((a, b) => b.meta.numEvidence - a.meta.numEvidence),
        5
      );
      const topEffectEdges = _.take(
        effectEdges.sort((a, b) => b.meta.numEvidence - a.meta.numEevidence),
        5
      );

      this.summaryData = {
        children: [
          {
            key: RELATIONSHIP_GROUP_KEY.CAUSE,
            count: causeEdges.length,
            children: topCauseEdges,
            meta: { checked: false }
          },
          {
            key: RELATIONSHIP_GROUP_KEY.EFFECT,
            count: effectEdges.length,
            children: topEffectEdges,
            meta: { checked: false }
          }
        ],
        meta: { checked: false, isSomeChildChecked: false }
      };
    },
    refresh2() {
      const components = this.selectedNode.components;
      const graphData = this.graphData;

      const causeStatement = this.statements.filter(s => components.includes(s.obj.concept));
      const effectStatement = this.statements.filter(s => components.includes(s.subj.concept));

      const causes = this.groupRelationships(causeStatement);
      const slicedCauses = causes.slice(0, 5); // Get top 5
      const effects = this.groupRelationships(effectStatement);
      const slicedEffects = effects.slice(0, 5); // Get top 5

      // Munge back into node containers
      let len = 0;
      len = slicedCauses.length;
      for (let i = 0; i < len; i++) {
        const source = slicedCauses[i].meta.source;
        const matchingNodes = graphData.nodes.filter(n => {
          return n.concept !== source && n.components.includes(source);
        });
        matchingNodes.forEach(n => {
          const clone = _.cloneDeep(slicedCauses[i]);
          clone.meta.source = n.concept;
          clone.key = `${clone.meta.source}///${clone.meta.target}`;
          slicedCauses.push(clone);
        });
      }

      len = slicedEffects.length;
      for (let i = 0; i < len; i++) {
        const target = slicedEffects[i].meta.target;
        const matchingNodes = graphData.nodes.filter(n => {
          return n.concept !== target && n.components.includes(target);
        });
        matchingNodes.forEach(n => {
          const clone = _.cloneDeep(slicedEffects[i]);
          clone.meta.target = n.concept;
          clone.key = `${clone.meta.source}///${clone.meta.target}`;
          slicedEffects.push(clone);
        });
      }

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
            meta.source = splitted[0];
            meta.target = splitted[1];
            meta.num_evidence = _.sumBy(s.dataArray, d => {
              return d.wm.num_evidence;
            });
            meta.disabled = this.isStatementEdgeinCAG({ source: splitted[0], target: splitted[1] }); // Check if the relationship already exists in the CAG
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
        if (!item.meta.disabled) {
          item.meta.checked = newState;
        }
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
        ? relationship.source
        : relationship.target;
    },
    openKBExplorer(relationshipGroupKey) {
      const components = this.selectedNode.components;
      const filters = filtersUtil.newFilters();

      if (relationshipGroupKey === RELATIONSHIP_GROUP_KEY.CAUSE) {
        filtersUtil.setClause(filters, 'objConcept', components, 'or', false);
        this.$router.push({ name: 'kbExplorer', query: { cag: this.currentCAG, view: 'graphs', filters: filters } });
      } else {
        filtersUtil.setClause(filters, 'subjConcept', components, 'or', false);
        this.$router.push({ name: 'kbExplorer', query: { cag: this.currentCAG, view: 'graphs', filters: filters } });
      }
    },
    isStatementEdgeinCAG(edge) {
      const graphData = this.graphData;

      const nodeSource = graphData.nodes.find(n => n.components.includes(edge.source));
      const nodeTarget = graphData.nodes.find(n => n.components.includes(edge.target));
      if (_.isNil(nodeSource) || _.isNil(nodeTarget)) {
        return false;
      }
      const edges = graphData.edges.map(edge => edge.source + '///' + edge.target);
      return edges.indexOf(nodeSource.concept + '///' + nodeTarget.concept) !== -1;
    },
    addToCAG() {
      if (this.numselectedRelationships < 1) {
        this.hasError = true;
        return;
      }
      const causeGroup = this.summaryData.children[0];
      const effectGroup = this.summaryData.children[1];
      const rootConcept = this.selectedNode.concept;

      const newEdges = [];
      if (!_.isEmpty(causeGroup.children)) {
        causeGroup.children.filter(c => c.meta.checked).forEach(edge => {
          newEdges.push({
            source: edge.meta.source,
            target: rootConcept,
            reference_ids: edge.dataArray.map(s => s.id)
          });
        });
      }
      if (!_.isEmpty(effectGroup.children)) {
        effectGroup.children.filter(c => c.meta.checked).forEach(edge => {
          newEdges.push({
            source: rootConcept,
            target: edge.meta.target,
            reference_ids: edge.dataArray.map(s => s.id)
          });
        });
      }

      // Calculate if there are new nodes
      const graphNodes = this.graphData.nodes;
      const newNodes = [];

      for (let i = 0; i < newEdges.length; i++) {
        const edge = newEdges[i];
        const source = edge.source;
        const target = edge.target;

        // Check source
        if (!_.some(graphNodes, d => d.concept === source)) {
          if (!_.some(newNodes, d => d.concept === source)) {
            newNodes.push({
              id: '',
              concept: source,
              label: this.ontologyFormatter(source),
              components: [source]
            });
          }
        }

        // Check target
        if (!_.some(graphNodes, d => d.concept === target)) {
          if (!_.some(newNodes, d => d.concept === target)) {
            newNodes.push({
              id: '',
              concept: target,
              label: this.ontologyFormatter(target),
              components: [target]
            });
          }
        }
      }

      console.log('new edges', newEdges);
      console.log('new nodes', newNodes);
      this.$emit('add-to-CAG', { nodes: newNodes, edges: newEdges });
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

.error-msg {
  color: $negative;
}

.bulk-actions {
  padding: 5px 0;
  border-bottom: 1px solid $separator;

  & > * {
    margin-right: 5px;
  }
}

</style>
