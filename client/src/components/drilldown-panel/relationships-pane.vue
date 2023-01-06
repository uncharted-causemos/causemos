<template>
  <div class="relationships-container">
    <div class="pane-summary">
      {{ ontologyFormatter(selectedNode.concept) }} ({{ relationshipCount }})
    </div>
    <button
      v-if="showGetSuggestionsButton"
      class="btn btn-call-to-action find-more-button"
      @click="showRelationshipSuggestions"
    >
      <i class="fa fa-fw fa-plus" />
      Get Suggestions
    </button>
    <collapsible-list-header
      @expand-all="expandAll = { value: true }"
      @collapse-all="expandAll = { value: false }"
    >
      <i
        class="fa fa-lg fa-fw"
        :class="{
          'fa-check-square-o': summaryData.meta.checked,
          'fa-square-o': !summaryData.meta.checked && !summaryData.isSomeChildChecked,
          'fa-minus-square-o': !summaryData.meta.checked && summaryData.meta.isSomeChildChecked,
        }"
        @click="toggle(summaryData)"
      />
      <small-icon-button
        v-tooltip.top="
          isKbExplorer
            ? 'Delete relationships from KB in bulk'
            : 'Remove relationships from CAG in bulk'
        "
        :disabled="numselectedNodes === 0"
        @click="removeRelationships()"
      >
        <i
          class="fa fa-lg fa-fw"
          :class="{ 'fa-minus-circle': !isKbExplorer, 'fa-trash': isKbExplorer }"
        />
      </small-icon-button>
    </collapsible-list-header>
    <div v-for="relationshipGroup in summaryData.children" :key="relationshipGroup.key">
      <collapsible-item v-if="!isFetchingStatements" :override="expandAll">
        <template #controls>
          <i
            v-if="relationshipGroup.count > 0"
            class="fa fa-lg fa-fw"
            :class="{
              'fa-check-square-o': relationshipGroup.meta.checked,
              'fa-square-o':
                !relationshipGroup.meta.checked && !relationshipGroup.isSomeChildChecked,
              'fa-minus-square-o':
                !relationshipGroup.meta.checked && relationshipGroup.meta.isSomeChildChecked,
            }"
            @click.stop="toggle(relationshipGroup)"
          />
          <i v-else class="fa fa-lg fa-fw fa-square-o disabled" />
        </template>
        <template #title class="relationships-title">
          {{ getRelationshipGroupDisplayString(relationshipGroup.key) }}
          ({{ getRelationshipGroupCause(relationshipGroup.key) }}
          <i class="fa fa-fw fa-long-arrow-right" />
          {{ getRelationshipGroupEffect(relationshipGroup.key) }}) ({{ relationshipGroup.count }})
        </template>
        <template v-if="relationshipGroup.children.length > 0" #content>
          <div class="relationships-list">
            <div
              v-for="relationship in relationshipGroup.children"
              :key="relationship.key"
              class="relationships-item"
            >
              <i
                class="fa fa-lg fa-fw"
                :class="{
                  'fa-check-square-o': relationship.meta.checked,
                  'fa-square-o': !relationship.meta.checked,
                }"
                @click.stop="toggle(relationship)"
              />
              <span :style="relationship.meta.style" @click="handleClick(relationship.meta)"
                >{{
                  ontologyFormatter(
                    filterRedundantConcept(relationshipGroup.key, relationship.meta)
                  )
                }}
              </span>
              <small-icon-button
                v-tooltip.top="
                  isKbExplorer ? 'Delete relationship from KB' : 'Remove relationship from CAG'
                "
                @click.stop="removeRelationship(relationship)"
              >
                <i
                  class="fa fa-lg fa-fw"
                  :class="{ 'fa-minus-circle': !isKbExplorer, 'fa-trash': isKbExplorer }"
                />
              </small-icon-button>
            </div>
          </div>
        </template>
        <template v-else #content>
          <message-display class="empty-relationship" :message="'None'" />
        </template>
      </collapsible-item>
    </div>
    <div v-if="isFetchingStatements" class="pane-loading-message">
      <i class="fa fa-spin fa-spinner pane-loading-icon" /><span>{{ loadingMessage }}</span>
    </div>
  </div>
</template>

<script>
import _ from 'lodash';
import { mapActions, mapGetters } from 'vuex';

import CollapsibleItem from '@/components/drilldown-panel/collapsible-item';
import CollapsibleListHeader from '@/components/drilldown-panel/collapsible-list-header.vue';
import MessageDisplay from '@/components/widgets/message-display';
import SmallIconButton from '@/components/widgets/small-icon-button';

import aggregationsUtil from '@/utils/aggregations-util';
import { STATEMENT_POLARITY } from '@/utils/polarity-util';
import { calcEdgeColor } from '@/utils/scales-util';

const RELATIONSHIP_GROUP_KEY = {
  CAUSE: 'cause',
  EFFECT: 'effect',
};

export default {
  name: 'RelationshipsPane',
  components: {
    CollapsibleItem,
    MessageDisplay,
    SmallIconButton,
    CollapsibleListHeader,
  },
  emits: ['show-relationship-suggestions', 'remove-edge', 'select-edge'],
  props: {
    selectedNode: {
      type: Object,
      default: null,
    },
    modelComponents: {
      type: Object,
      default: () => {},
    },
    statements: {
      type: Array,
      default: () => [],
    },
    isFetchingStatements: {
      type: Boolean,
      default: false,
    },
    showGetSuggestionsButton: {
      type: Boolean,
      default: false,
    },
  },
  data: () => ({
    loadingMessage: 'Loading relationships...',
    expandAll: null,
    summaryData: { children: [], meta: { checked: false } },
    STATEMENT_POLARITY,
  }),
  computed: {
    ...mapGetters({
      currentView: 'app/currentView',
    }),
    numselectedNodes() {
      let cnt = 0;
      this.summaryData.children.forEach((resourceGroup) => {
        cnt += resourceGroup.children.filter((d) => d.meta.checked === true).length;
      });
      return cnt;
    },
    relationshipCount() {
      return this.summaryData.children.reduce((accumulator, relationshipGroup) => {
        return accumulator + relationshipGroup.count;
      }, 0);
    },
    causeEdges() {
      const edges = _.get(this.modelComponents, 'edges', []);
      return edges.filter((edge) => edge.target === this.selectedNode.concept);
    },
    effectEdges() {
      const edges = _.get(this.modelComponents, 'edges', []);
      return edges.filter((edge) => edge.source === this.selectedNode.concept);
    },
    isKbExplorer() {
      return this.currentView === 'kbExplorer';
    },
  },
  watch: {
    statements(n, o) {
      if (_.isEqual(n, o)) return;
      this.refresh();
    },
  },
  mounted() {
    this.refresh();
  },
  methods: {
    ...mapActions({
      setUpdateToken: 'app/setUpdateToken',
    }),
    getRelationshipGroupDisplayString(relationshipGroupKey) {
      return relationshipGroupKey === RELATIONSHIP_GROUP_KEY.CAUSE ? 'Drivers' : 'Impacts';
    },
    initializeData() {
      this.expandAll = { value: true };
    },
    refresh() {
      this.initializeData();
      const topic = this.selectedNode.concept;
      // FIXME: might need to do special case for self-loops to not over count
      const causeStatement = this.statements.filter((s) => s.obj.concept === topic);
      const effectStatement = this.statements.filter((s) => s.subj.concept === topic);

      const causes = this.groupRelationships(causeStatement);
      const effects = this.groupRelationships(effectStatement);

      // modelComponents doesn't exist when this is used in the Knowledge Explorer
      const missingCauseEdges = this.causeEdges.filter(
        (edge) => _.findIndex(causeStatement, (s) => s.subj.concept === edge.source) === -1
      );
      const missingEffectEdges = this.effectEdges.filter(
        (edge) => _.findIndex(effectStatement, (s) => s.obj.concept === edge.target) === -1
      );

      this.addMissingRelationships(missingCauseEdges, causes);
      this.addMissingRelationships(missingEffectEdges, effects);

      // Massage the structure a bit to fit into the common aggregated schema
      this.summaryData = {
        children: [
          {
            key: RELATIONSHIP_GROUP_KEY.CAUSE,
            count: causes.length,
            children: causes,
            meta: { checked: false, isSomeChildChecked: false },
          },
          {
            key: RELATIONSHIP_GROUP_KEY.EFFECT,
            count: effects.length,
            children: effects,
            meta: { checked: false, isSomeChildChecked: false },
          },
        ],
        meta: { checked: false, isSomeChildChecked: false },
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
            meta.isSomeChildChecked = false;
            meta.source = splitted[0];
            meta.target = splitted[1];
            meta.num_evidence = _.sumBy(s.dataArray, (d) => {
              return d.wm.num_evidence;
            });
            return meta;
          },
        },
      ]);
      group.forEach((d) => {
        const reducedStatements = d.dataArray.reduce(
          (accumulator, s) => {
            const wm = s.wm;
            const p = wm.statement_polarity;

            accumulator.belief_score += s.belief;
            accumulator.same += p === STATEMENT_POLARITY.SAME ? 1 : 0;
            accumulator.opposite += p === STATEMENT_POLARITY.OPPOSITE ? 1 : 0;
            accumulator.unknown += p === STATEMENT_POLARITY.UNKNOWN ? 1 : 0;
            return accumulator;
          },
          { same: 0, opposite: 0, unknown: 0, belief_score: 0 }
        );
        reducedStatements.belief_score = reducedStatements.belief_score / d.dataArray.length;
        d.meta.style = { color: calcEdgeColor(reducedStatements) };
      });
      return group;
    },
    addMissingRelationships(missingEdges, groupedStatements) {
      missingEdges.forEach((edge) => {
        groupedStatements.push({
          key: `${edge.source}///${edge.target}`,
          count: 0,
          dataArray: [],
          meta: {
            checked: false,
            isSomeChildChecked: false,
            source: edge.source,
            target: edge.target,
            num_evidence: 0,
            style: { color: calcEdgeColor({ polarity: edge.user_polarity, belief_score: 0.5 }) },
          },
        });
      });
    },
    toggle(item) {
      // Recursive helpers
      const recursiveDown = (item, newState) => {
        item.meta.checked = newState;
        if (!item.children) return;
        item.children.forEach((child) => recursiveDown(child, newState));
      };

      const recursiveUp = (item) => {
        if (!_.isEmpty(item.children)) {
          item.children.forEach((child) => recursiveUp(child));
          const numChecked = item.children.filter((d) => d.meta.checked).length;
          const numPartiallyChecked = item.children.filter((d) => d.meta.isSomeChildChecked).length;
          item.meta.checked = numChecked === item.children.length;
          item.meta.isSomeChildChecked = numChecked > 0 || numPartiallyChecked > 0;
        }
      };

      // Toggle on if not currently checked and no children are partially or fully checked
      //  otherwise toggle off
      item.meta.checked = !item.meta.isSomeChildChecked && !item.meta.checked;

      // Traverse down to change children, then traverse up to update parents
      recursiveDown(item, item.meta.checked);
      recursiveUp(this.summaryData);
    },
    handleClick(edge) {
      const formattedEdge = { source: edge.source, target: edge.target };
      this.$emit('select-edge', formattedEdge);
    },
    removeRelationship(relationship) {
      const splitted = relationship.key.split('///');
      const edge = [{ source: splitted[0], target: splitted[1] }];

      this.$emit('remove-edge', edge);
    },
    removeRelationships() {
      const edges = [];
      this.summaryData.children.forEach((resourceGroup) => {
        if (!_.isEmpty(resourceGroup.children)) {
          resourceGroup.children.forEach((item) => {
            if (item.meta.checked) {
              const splitted = item.key.split('///');
              edges.push({ source: splitted[0], target: splitted[1] });
            }
          });
        }
      });

      this.$emit('remove-edge', edges);
    },
    filterRedundantConcept(relationshipGroupKey, relationship) {
      return relationshipGroupKey === RELATIONSHIP_GROUP_KEY.CAUSE
        ? relationship.source
        : relationship.target;
    },
    getRelationshipGroupCause(relationshipGroupKey) {
      return relationshipGroupKey === RELATIONSHIP_GROUP_KEY.CAUSE
        ? '?'
        : this.ontologyFormatter(this.selectedNode.concept);
    },
    getRelationshipGroupEffect(relationshipGroupKey) {
      return relationshipGroupKey === RELATIONSHIP_GROUP_KEY.EFFECT
        ? '?'
        : this.ontologyFormatter(this.selectedNode.concept);
    },
    showRelationshipSuggestions() {
      this.$emit('show-relationship-suggestions');
    },
  },
};
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.relationships-title {
  font-weight: 600;
  padding: 5px 0;
}

.relationships-list {
  list-style: none;
}

.relationships-item {
  display: flex;
  align-items: center;

  &:hover {
    background: #f0f0f0;
  }

  span {
    flex: 1;
    padding: 3px 0 3px 18px;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }
}

.empty-relationship {
  margin-left: 48px;
}

.find-more-button {
  margin-bottom: 5px;
  width: 100%;
}
</style>
