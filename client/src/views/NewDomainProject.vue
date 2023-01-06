<template>
  <div class="new-project-container">
    <h2>Define New Domain Model Project</h2>
    <form @submit.prevent>
      <div class="form-group">
        <label>Name*</label>
        <input
          v-model="projectName"
          v-focus
          type="text"
          class="form-control"
          @keyup.enter.stop="create"
        />
        <div v-if="hasError" class="error-msg">
          {{ errorMsg }}
        </div>
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea v-model="projectDescription" rows="5" class="form-control" />
      </div>
      <div class="form-group">
        <label>Website:</label>
        <input v-model="projectWebsite" type="text" class="form-control" />
      </div>
      <div class="form-group">
        <label>Maintainer</label>
        <div style="display: flex">
          <div style="display: flex; flex-direction: column">
            <label style="font-weight: normal">Name</label>
            <input v-model="maintainerName" type="text" class="form-control" />
          </div>
          <div style="display: flex; flex-direction: column">
            <label style="font-weight: normal">Organization</label>
            <input v-model="maintainerOrganization" type="text" class="form-control" />
          </div>
          <div style="display: flex; flex-direction: column">
            <label style="font-weight: normal">Email</label>
            <input v-model="maintainerEmail" type="text" class="form-control" />
          </div>
        </div>
        <small-text-button :label="'+ Add Maintainer'" @click="addMaintainer()" />
        <div v-for="maintainer in maintainers" :key="maintainer.name" style="display: flex">
          {{ maintainer.name }} | {{ maintainer.organization }} | {{ maintainer.email }}
          <i
            class="fa fa-fw fa-close delete-maintainer"
            @click.stop="removeMaintainer(maintainer.name)"
          />
        </div>
      </div>
    </form>
    <div class="controls">
      <button type="button" class="btn" @click="cancel">Cancel</button>
      <button type="button" class="btn btn-call-to-action" @click="create">Create</button>
    </div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { mapActions } from 'vuex';
import { defineComponent } from 'vue';
import { ProjectType } from '@/types/Enums';
import domainProjectService from '@/services/domain-project-service';
import { DomainProject } from '@/types/Common';
import { DatacubeMaintainer } from '@/types/Datacube';
import SmallTextButton from '@/components/widgets/small-text-button.vue';

const MSG_EMPTY_PROJECT_NAME = 'Family name cannot be blank';
const MSG_PROJECT_NAME_ALREADY_EXIST = 'Family name already exists';

export default defineComponent({
  name: 'NewDomainProjectView',
  components: {
    SmallTextButton,
  },
  data: () => ({
    existingDomainProjectNames: [] as string[],
    projectName: '',
    projectDescription: '',
    projectWebsite: '',
    maintainerName: '',
    maintainerOrganization: '',
    maintainerEmail: '',
    maintainers: [] as DatacubeMaintainer[],
    hasError: false,
    errorMsg: '' as string | null,
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
    },
  },
  async mounted() {
    const domainProjectSearchFields = {
      // DomainProjectFilterFields
      type: 'model',
    };
    const existingProjects: DomainProject[] = await domainProjectService.getProjects(
      domainProjectSearchFields
    );
    this.existingDomainProjectNames = existingProjects.map((p) => p.name.toLowerCase());
  },
  methods: {
    ...mapActions({
      enableOverlay: 'app/enableOverlay',
      disableOverlay: 'app/disableOverlay',
      clearLastQuery: 'query/clearLastQuery',
      setProjectMetadata: 'app/setProjectMetadata',
    }),
    removeMaintainer(maintainerName: string) {
      this.maintainers = this.maintainers.filter((m) => m.name !== maintainerName);
    },
    addMaintainer() {
      if (this.maintainerName !== '') {
        this.maintainers.push({
          name: this.maintainerName,
          organization: this.maintainerOrganization,
          email: this.maintainerEmail,
          website: '',
        });
        this.maintainerName = '';
        this.maintainerOrganization = '';
        this.maintainerEmail = '';
      }
    },
    async create() {
      if (_.isEmpty(this.projectName)) {
        this.hasError = true;
        this.errorMsg = MSG_EMPTY_PROJECT_NAME;
      }
      if (this.existingDomainProjectNames.includes(this.projectName.toLowerCase())) {
        this.hasError = true;
        this.errorMsg = MSG_PROJECT_NAME_ALREADY_EXIST;
      }
      if (this.hasError) return;

      this.enableOverlay('Creating domain project ' + this.projectName);

      // call the project creation service here and get the created project id
      const projectId = await domainProjectService.createProject(
        this.projectName,
        this.projectDescription,
        this.projectWebsite,
        this.maintainers
      );

      // fetch the full project object so that it can be used as projectMetadata upon redirection
      const createdProject = await domainProjectService.getProject(projectId);
      this.setProjectMetadata(createdProject);

      this.disableOverlay();

      // redirect to the family page
      this.clearLastQuery(); // Reset filters every time we create a new project
      this.$router.push({
        name: 'domainDatacubeOverview',
        params: {
          project: projectId as string,
          projectType: ProjectType.Model,
        },
      });
    },
    cancel() {
      this.$router.push({ name: 'home' });
    },
  },
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables';

.new-project-container {
  max-width: 1000px;
  margin-left: 100px;
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

.delete-maintainer {
  font-size: $font-size-large;
  width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  color: #ff6955;
  cursor: pointer;

  &:hover {
    color: #850f00;
  }
}
</style>
