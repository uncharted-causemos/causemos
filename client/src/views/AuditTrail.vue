<template>
  <div class="container-fluid">
    <div class="row">
      <div class="col-md-1" />
      <div class="col-md-10">
        <div class="row">
          <div class="col-md-10">
            <h4>Audit trail</h4>
          </div>
          <div class="col-md-2">
            <div>
              <a
                :href="downloadLink"
                download>
                <i class="fa fa-fw fa-download" />
                Export Audit
              </a>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-1" />
    </div>

    <div class="row">
      <div class="col-md-1" />
      <div class="col-md-10">
        <div class="table-container">
          <table class="table table-condensed table-hover table-bordered">
            <thead>
              <tr>
                <th colspan="1">Update Type</th>
                <th colspan="1">Readers</th>
                <th colspan="1">Before</th>
                <th colspan="1">After</th>
                <th colspan="1">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, idx) of auditTrailData"
                :key="idx">
                <td>
                  {{ item.update_type }}
                </td>
                <td>
                  <div>
                    {{ item.before.wm.readers.join(', ') }}
                  </div>
                </td>
                <td class="compact-statement">
                  <audit-entry
                    :display-values="item.before"
                    :compare-values="item.after"
                    :update-type="item.update_type"
                  />
                </td>
                <td class="compact-statement">
                  <audit-entry
                    :display-values="item.after"
                    :compare-values="item.before"
                    :update-type="item.update_type"
                  />
                </td>
                <td>
                  {{ item.modified_at| date-formatter }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="pagination">
          <button
            class="btn btn-sm btn-primary"
            :disabled="pageFrom === 0"
            @click="prev()"
          >Previous</button>
          <span class="pagination-label">{{ pageFrom+1 }} to {{ pageSizeCount }} of {{ auditsCount | number-formatter }} audits </span>
          <button
            class="btn btn-sm btn-primary"
            :disabled="auditsCount < incrementedPageSize"
            @click="next()"
          >Next</button>
        </div>
      </div>
      <div class="col-md-1" />
    </div>

  </div>
</template>

<script>

import { mapActions, mapGetters } from 'vuex';
import API from '@/api/api';
import AuditEntry from '@/components/audit/audit-entry';

export default {
  name: 'AuditTrail',
  components: {
    AuditEntry
  },
  data: () => ({
    auditTrailData: [],
    auditsCount: 0
  }),
  computed: {
    ...mapGetters({
      project: 'app/project',
      auditsQuery: 'query/audits'
    }),
    pageFrom() {
      return this.auditsQuery.from;
    },
    pageSize() {
      return this.auditsQuery.size;
    },
    incrementedPageSize() {
      return this.pageFrom + this.pageSize;
    },
    pageSizeCount() {
      return Math.min(this.auditsCount, this.incrementedPageSize);
    },
    downloadLink() {
      return '/api/audits/download?projectId=' + this.project;
    }
  },
  watch: {
    pageFrom() {
      this.refresh();
    },
    pageSize() {
      this.refresh();
    }
  },
  mounted() {
    this.refresh();
  },
  methods: {
    ...mapActions({
      setPagination: 'query/setPagination'
    }),
    refresh() {
      API.get('audits', {
        params: { projectId: this.project, from: this.pageFrom, size: this.pageSize }
      }).then((d) => {
        this.auditTrailData = d.data;
      });
      // Get total count for audits
      API.get('audits/counts', {
        params: { projectId: this.project }
      }).then(d => {
        this.auditsCount = d.data;
      });
    },
    prev() {
      this.setPagination({
        view: 'audits',
        from: this.pageFrom - this.pageSize,
        size: this.pageSize
      });
    },
    next() {
      this.setPagination({
        view: 'audits',
        from: this.pageFrom + this.pageSize,
        size: this.pageSize
      });
    }
  }
};
</script>
