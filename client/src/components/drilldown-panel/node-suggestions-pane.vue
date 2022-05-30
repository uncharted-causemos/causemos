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

import filtersUtil from '@/utils/filters-util';
import { calculateNewNodesAndEdges, extractEdgesFromStatements, sortSuggestionsByEvidenceCount } from '@/utils/relationship-suggestion-util';
import { EdgeDirection } from '@/types/Enums';

const RELATIONSHIP_GROUP_KEY = {
  CAUSE: 'cause',
  EFFECT: 'effect'
};

const MSG_EMPTY_SELECTION = 'There are no selected relationships';

const convertEdgeSuggestionToChecklistItem = (suggestion) => {
  const { source, target, statements, color } = suggestion;
  return {
    meta: {
      checked: false,
      source,
      target,
      style: {
        color
      },
      numEvidence: _.sumBy(statements, s => s.wm.num_evidence)
    },
    dataArray: statements
  };
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
      const causeEdges = extractEdgesFromStatements(
        this.statements,
        this.selectedNode,
        this.graphData,
        EdgeDirection.Incoming
      );
      const effectEdges = extractEdgesFromStatements(
        this.statements,
        this.selectedNode,
        this.graphData,
        EdgeDirection.Outgoing
      );
      const topCauseEdges = _.take(
        sortSuggestionsByEvidenceCount(causeEdges),
        5
      ).map(convertEdgeSuggestionToChecklistItem);
      const topEffectEdges = _.take(
        sortSuggestionsByEvidenceCount(effectEdges),
        5
      ).map(convertEdgeSuggestionToChecklistItem);
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
      const newSubgraph = calculateNewNodesAndEdges(newEdges, this.graphData, this.ontologyFormatter);
      this.$emit('add-to-CAG', newSubgraph);
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
