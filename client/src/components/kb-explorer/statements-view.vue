<template>
  <div class="statements-table-container h-100 flex flex-col">
    <template v-if="statements.length > 0">
      <div class="table-container flex-grow-1 h-0">
        <table class="table table-condensed table-hover table-bordered">
          <thead>
            <tr>
              <th
                v-if="numContextVisible > 0"
                :colspan="numContextVisible">Context</th>
              <th :colspan="numSubjVisible">Cause</th>
              <th
                v-if="numRelVisible > 0"
                :colspan="numRelVisible"
              >Relation</th>
              <th :colspan="numObjVisible">Effect</th>
              <th
                v-if="numEvidenceVisible > 0"
                :colspan="numEvidenceVisible"
              >Evidence</th>
              <th
                v-if="visibleColumns[FIELDS.READERS]"
                colspan="1"
              >Reader</th>
            </tr>
            <tr>
              <th v-if="visibleColumns[FIELDS.YEAR]">
                Temporal Context - Year
              </th>
              <th v-if="visibleColumns[FIELDS.GEO_LOCATION_NAME]">
                Geospatial Context
              </th>
              <th v-if="visibleColumns[FIELDS.SUBJ_POLARITY]">
                Polarity <sort-indicator :field="FIELDS.SUBJ_POLARITY" />
              </th>
              <th v-if="visibleColumns[FIELDS.SUBJ_ADJECTIVES]">
                Adjectives
              </th>
              <th v-if="visibleColumns[FIELDS.SUBJ]">
                Name
              </th>
              <th
                v-if="visibleColumns[FIELDS.SUBJ_CONCEPT]"
                class="highlight">
                Concept
              </th>
              <th v-if="visibleColumns[FIELDS.SUBJ_CONCEPT_SCORE]">
                Grounding Score <sort-indicator :field="FIELDS.SUBJ_CONCEPT_SCORE" />
              </th>

              <th v-if="visibleColumns[FIELDS.TYPE]">
                Type <sort-indicator :field="FIELDS.TYPE" />
              </th>
              <th v-if="visibleColumns[FIELDS.STATEMENT_POLARITY]">
                Statement Polarity <sort-indicator :field="FIELDS.STATEMENT_POLARITY" />
              </th>
              <th v-if="visibleColumns[FIELDS.BELIEF]">
                Believability Score <sort-indicator :field="FIELDS.BELIEF" />
              </th>

              <th v-if="visibleColumns[FIELDS.OBJ_POLARITY]">
                Polarity <sort-indicator :field="FIELDS.OBJ_POLARITY" />
              </th>
              <th v-if="visibleColumns[FIELDS.OBJ_ADJECTIVES]">
                Adjectives
              </th>
              <th v-if="visibleColumns[FIELDS.OBJ]">
                Name
              </th>
              <th
                v-if="visibleColumns[FIELDS.OBJ_CONCEPT]"
                class="highlight">
                Concept
              </th>
              <th v-if="visibleColumns[FIELDS.OBJ_CONCEPT_SCORE]">
                Grounding Score <sort-indicator :field="FIELDS.OBJ_CONCEPT_SCORE" />
              </th>

              <th v-if="visibleColumns[FIELDS.NUM_EVIDENCES]">Evidence Count (shown/total)</th>
              <th v-if="visibleColumns[FIELDS.SENTENCES]">Evidence Text</th>
              <th v-if="visibleColumns[FIELDS.READERS]"><!-- reader --></th>

            </tr>
          </thead>
          <tbody>
            <tr
              v-for="statement of statements"
              :key="statement.id">
              <td v-if="visibleColumns[FIELDS.YEAR]">{{ statement.years.join(', ') }}</td>
              <td v-if="visibleColumns[FIELDS.GEO_LOCATION_NAME]">{{ [statement.subj.geo_context, statement.obj.geo_context] | location-formatter }}</td>
              <td v-if="visibleColumns[FIELDS.SUBJ_POLARITY]">{{ statement.subj.polarity | polarity-formatter }}</td>
              <td v-if="visibleColumns[FIELDS.SUBJ_ADJECTIVES]">{{ statement.subj.adjectives | list-formatter }}</td>
              <td v-if="visibleColumns[FIELDS.SUBJ]">{{ statement.subj.factor }}</td>
              <td
                v-if="visibleColumns[FIELDS.SUBJ_CONCEPT]"
                class="highlight">{{ statement.subj.concept | ontology-formatter }}</td>
              <td v-if="visibleColumns[FIELDS.SUBJ_CONCEPT_SCORE]">{{ statement.subj.concept_score | precision-formatter }}</td>

              <td v-if="visibleColumns[FIELDS.TYPE]">{{ statement.type }}</td>
              <td v-if="visibleColumns[FIELDS.STATEMENT_POLARITY]">{{ statement.wm.statement_polarity | statement-polarity-formatter }}</td>
              <td v-if="visibleColumns[FIELDS.BELIEF]">{{ statement.belief | precision-formatter }}</td>

              <td v-if="visibleColumns[FIELDS.OBJ_POLARITY]">{{ statement.obj.polarity | polarity-formatter }}</td>
              <td v-if="visibleColumns[FIELDS.OBJ_ADJECTIVES]">{{ statement.obj.adjectives | list-formatter }}</td>
              <td v-if="visibleColumns[FIELDS.OBJ]">{{ statement.obj.factor }}</td>
              <td
                v-if="visibleColumns[FIELDS.OBJ_CONCEPT]"
                class="highlight">{{ statement.obj.concept | ontology-formatter }}</td>
              <td v-if="visibleColumns[FIELDS.OBJ_CONCEPT_SCORE]">{{ statement.obj.concept_score | precision-formatter }}</td>

              <td v-if="visibleColumns[FIELDS.NUM_EVIDENCES]">{{ statement.wm.num_evidence }}</td>
              <td
                v-if="visibleColumns[FIELDS.SENTENCES]"
                class="sentences">
                <div v-if="!isEmpty(statement.evidence)">
                  {{ statement.evidence.map(e => e.evidence_context.text).join(',') }}
                </div>
              </td>
              <td v-if="visibleColumns[FIELDS.READERS]">{{ statement.wm.readers.join(',') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <pagination
        :label="'statements'"
        :total="statementsCount"
      />
    </template>
    <message-display
      v-if="statements.length === 0"
      message="Sorry, no results were found"
    />
  </div>
</template>

<script>
import _ from 'lodash';
import { mapActions, mapGetters } from 'vuex';

import API from '@/api/api';
import SortIndicator from '@/components/sort-indicator';
import Pagination from '@/components/pagination';
import MessageDisplay from '@/components/widgets/message-display';

import codeUtil from '@/utils/code-util';
import filtersUtil from '@/utils/filters-util';

export default {
  name: 'StatementsView',
  components: {
    Pagination,
    SortIndicator,
    MessageDisplay
  },
  data: () => ({
    statements: [],
    FIELDS: codeUtil.FIELDS
  }),
  computed: {
    ...mapGetters({
      filters: 'query/filters',
      statementsQuery: 'query/statements',
      visibleColumns: 'statements/visibleColumns',
      numSubjVisible: 'statements/numSubjVisible',
      numObjVisible: 'statements/numObjVisible',
      numRelVisible: 'statements/numRelVisible',
      numContextVisible: 'statements/numContextVisible',
      numEvidenceVisible: 'statements/numEvidenceVisible',
      project: 'app/project',
      statementsCount: 'kb/filteredStatementCount',
      updateToken: 'app/updateToken'
    }),
    pageStart() {
      return this.statementsQuery.from;
    },
    pageLimit() {
      return this.statementsQuery.size;
    },
    sort() {
      return this.statementsQuery.sort;
    }
  },
  watch: {
    filters(n, o) {
      if (filtersUtil.isEqual(n, o)) return;
      this.refresh();
    },
    statementsQuery(n, o) {
      if (_.isEqual(n, o)) return;
      this.refresh();
    },
    updateToken(n, o) {
      if (_.isEqual(n, o)) return;
      this.refresh();
    }
  },
  mounted() {
    this.refresh();
  },
  methods: {
    ...mapActions({
      addSearchTerm: 'query/addSearchTerm',
      removeSearchTerm: 'query/removeSearchTerm',
      setPagination: 'query/setPagination',
      enableOverlay: 'app/enableOverlay',
      disableOverlay: 'app/disableOverlay'
    }),
    refresh() {
      this.enableOverlay('Refreshing...');
      API.get(`projects/${this.project}/statements`, {
        params: { filters: this.filters, from: this.pageStart, size: this.pageLimit, sort: this.sort }
      }).then(d => {
        this.statements = d.data;

        this.statements.forEach(statement => {
          statement.years = [];
          if (statement.subj.time_context.start) {
            statement.years.push(statement.subj.time_context.start.year);
          }
          if (statement.obj.time_context.start) {
            statement.years.push(statement.obj.time_context.start.year);
          }
        });
        this.disableOverlay();
      });
    },
    isEmpty(obj) {
      return _.isEmpty(obj);
    }
  }
};
</script>
<style lang="scss" scoped>
@import "~styles/wm-theme/wm-theme";

.statements-table-container {
  height: 100%;
  padding: $padding-base-vertical;

  .pagination {
    padding: $padding-base-vertical;
    span {
      padding: $padding-base-horizontal;
    }
  }
.table-container {
  overflow-y: scroll;
  font-size: $font-size-small;
  padding-left: $padding-base-vertical;
  padding-right: $padding-base-vertical;

  table.table {
    th {
      position: sticky;
      top: 0px;
      z-index: 10;
      background: $color-background-lvl-2;
      text-align: center;
    }

    tbody tr td,
    thead tr th,
    thead {
      border-left: 1px solid $color-border-light;
      border-right: 1px solid $color-border-light;
    }

    td.highlight {
      font-weight: 600;
    }

    @media (max-width: 1800px) {
      .sentences {
        div {
          height: 20px;
          width: 200px;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          cursor: default;
        }
      }
      .sentences:hover {
          div {
            height: unset;
            overflow: unset;
            text-overflow: unset;
            white-space: unset;
          }
        }
      }
    }
  }
}
</style>
