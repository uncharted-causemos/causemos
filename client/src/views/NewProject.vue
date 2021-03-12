<template>
  <div class="new-project-container">
    <div class="container-fluid">
      <div class="row">
        <div class="col-md-1" />
        <div class="col-md-10">
          <div class="row title">
            <h2>Define New Project</h2>
          </div>
          <div class="row">
            <hr>
          </div>
          <div class="row">
            <form>
              <div class="form-group">
                <label>Name*</label>
                <input
                  v-model="projectName"
                  v-focus
                  type="text"
                  class="form-control"
                  @keyup.enter.stop="create"
                >
                <div
                  v-if="hasError"
                  class="error-msg">
                  {{ errorMsg }}
                </div>
              </div>
              <div class="form-group">
                <label>Description</label>
                <textarea
                  v-model="projectDescrption"
                  rows="5"
                  class="form-control" />
              </div>
            </form>
            <div>
              <h6>Knowledge Base*</h6>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th># Documents</th>
                    <th>Readers</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <knowledge-base-row
                  v-for="kb in kbList"
                  :key="kb.id"
                  :kb="kb"
                  :base-kb="baseKB"
                  @select="selectKB(kb.id)"
                />
              </table>
            </div>
            <div class="controls">
              <button
                type="button"
                class="btn btn-default"
                @click="cancel"
              >Cancel
              </button>
              <button
                type="button"
                class="btn btn-primary"
                @click="create"
              >Save &amp; Finish</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import _ from 'lodash';
import { mapActions } from 'vuex';
import projectService from '@/services/project-service';

import KnowledgeBaseRow from '@/components/new-project/knowledge-base-row';

const MSG_EMPTY_PROJECT_NAME = 'Project name cannot be blank';

export default {
  name: 'NewProjectView',
  components: {
    KnowledgeBaseRow
  },
  data: () => ({
    kbList: [],
    projectName: '',
    projectDescrption: '',
    hasError: false,
    baseKB: '',
    isProcessing: false
  }),
  watch: {
    projectName(n) {
      if (_.isEmpty(n)) {
        this.hasError = true;
        this.errorMsg = MSG_EMPTY_PROJECT_NAME;
      } else {
        this.hasError = false;
        this.errorMsg = null;
      }
    }
  },
  mounted() {
    this.refresh();
  },
  methods: {
    ...mapActions({
      enableOverlay: 'app/enableOverlay',
      disableOverlay: 'app/disableOverlay'
    }),
    async create() {
      if (_.isEmpty(this.projectName)) {
        this.hasError = true;
        this.errorMsg = MSG_EMPTY_PROJECT_NAME;
      }
      if (this.isProcessing || this.hasError) return;

      this.isProcessing = true;
      this.enableOverlay('Preparing project ' + this.projectName);

      const id = await projectService.createProject(this.baseKB, this.projectName, this.projectDescrption);

      this.isProcessing = false;
      this.disableOverlay();
      this.$router.push({ name: 'overview', params: { project: id } });
    },
    cancel() {
      this.$router.push({ name: 'home' });
    },
    refresh() {
      projectService.getKBs().then(kbs => {
        // ISO-8601 dates can be sorted lexicographically
        this.kbList = _.sortBy(kbs, 'created_at').reverse();
        this.baseKB = this.kbList[0].id;
      });
    },
    selectKB(kbId) {
      this.baseKB = kbId;
    }
  }
};
</script>

<style lang="scss" scoped>

.new-project-container {
  max-width: 1000px;
  .title {
    display: flex;
    h2 {
      flex: 1;
    }
    .btn {
      margin: 20px 0 10px 10px;
    }
  }
  .controls {
    display: flex;
    justify-content: flex-start;
    button {
      margin-top: 20px;
      margin-right: 10px;
    }
  }
  .form-control {
    background: #ffffff;
  }
  textarea {
    box-sizing: border-box;
    resize: none;
    outline: none;
  }
  select {
    width: 30%;
  }
  hr {
    margin: 5px;
  }
}

table {
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
  background-color: transparent;

  thead {
    border: 1px solid #bbb;

    th {
      border: none;
      padding: 12px;
    }
  }
}

</style>
