<template>
  <div class="statements-table-container h-100 flex flex-col">
    <template v-if="statements.length > 0">
      <div class="table-container flex-grow-1 h-0">
        <table class="table">
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
              <td v-if="visibleColumns[FIELDS.GEO_LOCATION_NAME]">{{ locationFormatter([statement.subj.geo_context, statement.obj.geo_context]) }}</td>
              <td v-if="visibleColumns[FIELDS.SUBJ_POLARITY]">{{ polarityFormatter(statement.subj.polarity) }}</td>
              <td v-if="visibleColumns[FIELDS.SUBJ_ADJECTIVES]">{{ listFormatter(statement.subj.adjectives) }}</td>
              <td v-if="visibleColumns[FIELDS.SUBJ]">{{ statement.subj.factor }}</td>
              <td
                v-if="visibleColumns[FIELDS.SUBJ_CONCEPT]"
                class="highlight">{{ ontologyFormatter(statement.subj.concept) }}</td>
              <td v-if="visibleColumns[FIELDS.SUBJ_CONCEPT_SCORE]">{{ precisionFormatter(statement.subj.concept_score) }}</td>

              <td v-if="visibleColumns[FIELDS.TYPE]">{{ statement.type }}</td>
              <td v-if="visibleColumns[FIELDS.STATEMENT_POLARITY]">{{ statementPolarityFormatter(statement.wm.statement_polarity) }}</td>
              <td v-if="visibleColumns[FIELDS.BELIEF]">{{ precisionFormatter(statement.belief) }}</td>

              <td v-if="visibleColumns[FIELDS.OBJ_POLARITY]">{{ polarityFormatter(statement.obj.polarity) }}</td>
              <td v-if="visibleColumns[FIELDS.OBJ_ADJECTIVES]">{{ listFormatter(statement.obj.adjectives) }}</td>
              <td v-if="visibleColumns[FIELDS.OBJ]">{{ statement.obj.factor }}</td>
              <td
                v-if="visibleColumns[FIELDS.OBJ_CONCEPT]"
                class="highlight">{{ ontologyFormatter(statement.obj.concept) }}</td>
              <td v-if="visibleColumns[FIELDS.OBJ_CONCEPT_SCORE]">{{ precisionFormatter(statement.obj.concept_score) }}</td>

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

<script lang="ts">
import _ from 'lodash';
import { defineComponent } from 'vue';
import { mapActions, mapGetters } from 'vuex';

import projectService from '@/services/project-service';
import SortIndicator from '@/components/sort-indicator.vue';
import Pagination from '@/components/pagination.vue';
import MessageDisplay from '@/components/widgets/message-display.vue';

import codeUtil from '@/utils/code-util';
import filtersUtil from '@/utils/filters-util';
import locationFormatter from '@/formatters/location-formatter';
import listFormatter from '@/formatters/list-formatter';
import statementPolarityFormatter from '@/formatters/statement-polarity-formatter';
import precisionFormatter from '@/formatters/precision-formatter';
import polarityFormatter from '@/formatters/polarity-formatter';
import { Statement } from '@/types/Statement';


interface StatementDisplay extends Statement {
  years? : number[];
}

export default defineComponent({
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
    pageStart(): number {
      return this.statementsQuery.from;
    },
    pageLimit(): number {
      return this.statementsQuery.size;
    },
    sort(): { [key: string]: string } {
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
    locationFormatter,
    listFormatter,
    statementPolarityFormatter,
    precisionFormatter,
    polarityFormatter,
    refresh() {
      this.enableOverlay('Refreshing...');

      projectService.getProjectStatements(this.project, this.filters, {
        from: this.pageStart, size: this.pageLimit, sort: this.sort
      }).then(statements => {
        this.statements = statements;
        this.statements.forEach((statement: StatementDisplay) => {
          statement.years = [];
          if (statement.subj.time_context?.start) {
            statement.years.push(statement.subj.time_context.start.year);
          }
          if (statement.obj.time_context?.start) {
            statement.years.push(statement.obj.time_context.start.year);
          }
        });
        this.disableOverlay();
      });
    },
    isEmpty(obj: any) {
      return _.isEmpty(obj);
    }
  }
});
</script>
<style lang="scss" scoped>
@import "~styles/variables";

.statements-table-container {
  height: 100%;
  padding: 8px;

  .pagination {
    padding: 8px;
    span {
      padding: 16px;
    }
  }
.table-container {
  overflow-y: scroll;
  font-size: $font-size-small;
  padding-left: 8px;
  padding-right: 8px;

  table.table {
    th {
      position: sticky;
      top: 0px;
      z-index: 10;
      background: $background-light-1;
      text-align: center;
    }

    tbody tr td,
    thead tr th,
    thead {
      border: 1px solid $separator;
      padding: 5px;
    }

    tbody tr:hover {
      background: $background-light-2;
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
