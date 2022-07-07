<template>
  <div class="new-project-container">
    <h2>Define New Project</h2>
    <form @submit.prevent>
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
          v-model="projectDescription"
          rows="5"
          class="form-control" />
      </div>
    </form>
    <label>Knowledge Base*</label>
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
    <div class="controls">
      <button
        type="button"
        class="btn"
        @click="cancel"
      >Cancel
      </button>
      <button
        type="button"
        class="btn btn-call-to-action"
        @click="create"
      >Save &amp; Finish</button>
    </div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { mapActions } from 'vuex';
import { defineComponent } from 'vue';
import projectService from '@/services/project-service';

import KnowledgeBaseRow from '@/components/new-project/knowledge-base-row.vue';
import { KnowledgeBase, Project } from '@/types/Common';
import { ProjectType } from '@/types/Enums';


const MSG_EMPTY_PROJECT_NAME = 'Project name cannot be blank';
const MSG_PROJECT_NAME_ALREADY_EXIST = 'Project name already exists';

export default defineComponent({
  name: 'NewProjectView',
  components: {
    KnowledgeBaseRow
  },
  data: () => ({
    kbList: [] as KnowledgeBase[],
    existingProjectNames: [] as string[],
    projectName: '',
    projectDescription: '',
    hasError: false,
    baseKB: '',
    isProcessing: false,
    errorMsg: '' as string | null
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
  async mounted() {
    this.refresh();

    const existingProjects: Project[] = await projectService.getProjects();
    this.existingProjectNames = existingProjects.map(p => p.name.toLowerCase());
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
      if (this.existingProjectNames.includes(this.projectName.toLowerCase())) {
        this.hasError = true;
        this.errorMsg = MSG_PROJECT_NAME_ALREADY_EXIST;
      }
      if (this.isProcessing || this.hasError) return;

      this.isProcessing = true;
      this.enableOverlay('Preparing project ' + this.projectName);

      const id = await projectService.createProject(this.baseKB, this.projectName, this.projectDescription);

      this.isProcessing = false;
      this.disableOverlay();
      this.$router.push({ name: 'overview', params: { project: id, projectType: ProjectType.Analysis } });
    },
    cancel() {
      this.$router.push({ name: 'home' });
    },
    refresh() {
      projectService.getKBs().then((kbs: KnowledgeBase[]) => {
        // ISO-8601 dates can be sorted lexicographically
        this.kbList = _.sortBy(kbs, 'created_at').reverse();
        this.baseKB = this.kbList[0].id;
      });
    },
    selectKB(kbId: string) {
      this.baseKB = kbId;
    }
  }
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables';

.new-project-container {
  margin-left: 100px;
  max-width: 1000px;
  .controls {
    display: flex;
    justify-content: flex-start;
    margin-top: 20px;
    margin-bottom: 20px;
    button {
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

.error-msg {
  color: $negative;
}

</style>
