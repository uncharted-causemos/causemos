<template>
  <div class="home-container">
    <div class="logo-container">
      <img class="logo" src="../assets/causemos-logo-colour.svg" alt="CauseMos logo" />
      <div class="descriptions">
        Understand complex multi-domain issues by leveraging integrated knowledge, data, and models
      </div>
    </div>
    <div class="columns">
      <Panel :pt="{ content: { class: 'project-column' } }" class="panel">
        <div class="title">
          <h3>Analysis projects</h3>
          <Button
            label="New analysis project"
            @click="gotoNewProject"
            class="fixed-width-control"
          />
        </div>
        <div class="controls">
          <InputText
            v-model="projectListQueryString"
            placeholder="Search projects"
            class="flex-1"
          />
          <FloatLabel class="fixed-width-control">
            <Select
              :options="SORTING_OPTIONS"
              :model-value="selectedSortingOption"
              @update:model-value="sort"
              inputId="analysis-project-sort-dropdown"
              class="labelled-select"
            />
            <label for="analysis-project-sort-dropdown">Sort by</label>
          </FloatLabel>
        </div>
        <div class="projects-list">
          <div class="projects-list-header">
            <div class="table-column extra-wide">Name</div>
            <div class="table-column">Analyses</div>
            <div class="table-column">Updated</div>
            <div class="table-column extra-small">
              <!-- no title necessary for delete button column -->
            </div>
          </div>
          <div class="projects-list-elements">
            <project-card
              v-for="project in filteredProjects"
              :key="project.id"
              :project="project"
              @delete="deleteProject"
            />
          </div>
        </div>
      </Panel>

      <Panel :pt="{ content: { class: 'project-column' } }" class="panel">
        <div class="title">
          <h3>Domain models and datasets</h3>
          <Button
            label="New domain model project"
            @click="gotoNewFamilyProject"
            class="fixed-width-control"
          />
        </div>
        <div class="controls">
          <SelectButton
            :options="[
              { label: 'Domain Models', value: 'models' },
              { label: 'Datasets', value: 'datasets' },
            ]"
            :model-value="selectedDataType"
            option-label="label"
            option-value="value"
            @update:model-value="setSelectedDataType"
          />
          <InputText
            v-model="domainDatacubesQueryString"
            :placeholder="`Search ${selectedDataType}`"
            class="flex-1"
          />

          <FloatLabel class="fixed-width-control">
            <Select
              :options="SORTING_OPTIONS"
              :model-value="selectedDatacubeSortingOption"
              @update:model-value="setDatacubeSort"
              inputId="analysis-project-sort-dropdown"
              class="labelled-select"
            />
            <label for="analysis-project-sort-dropdown">Sort by</label>
          </FloatLabel>
        </div>
        <div class="projects-list">
          <div v-if="selectedDataType === 'models'" class="projects-list-header">
            <div class="table-column extra-wide">Family name</div>
            <div class="table-column">Published Instances</div>
            <div class="table-column">Registered Instances</div>
            <div class="table-column extra-wide">Source</div>
            <div class="table-column">Updated</div>
            <div class="table-column extra-small">
              <!-- no title necessary for delete button column -->
            </div>
          </div>
          <div v-else class="projects-list-header">
            <div class="table-column extra-wide">Dataset name</div>
            <div class="table-column">Indicators</div>
            <div class="table-column extra-wide">Source</div>
            <div class="table-column">Registered</div>
          </div>
          <div class="projects-list-elements">
            <domain-datacube-project-card
              v-for="project in filteredFamilyList"
              :key="project.id"
              :project="project"
              @delete="deleteDomainProject"
            />
          </div>
        </div>
      </Panel>
    </div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import { computed, onMounted, ref } from 'vue';
import projectService from '@/services/project-service';
import ProjectCard from '@/components/home/project-card.vue';
import DomainDatacubeProjectCard from '@/components/home/domain-datacube-project-card.vue';
import { Project, DomainProject, DatasetInfo, DatacubeFamily } from '@/types/Common';
import domainProjectService from '@/services/domain-project-service';
import API from '@/api/api';
import { modifiedAtSorter, nameSorter, sortItem, SortOptions } from '@/utils/sort/sort-items';
import { ProjectType } from '@/types/Enums';
import SelectButton from 'primevue/selectbutton';
import useOverlay from '@/composables/useOverlay';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import FloatLabel from 'primevue/floatlabel';
import Select from 'primevue/select';
import Panel from 'primevue/panel';

const SORTING_OPTIONS = Object.values(SortOptions);

const projectListQueryString = ref('');
const projectsList = ref<Project[]>([]);

const selectedSortingOption = ref(SortOptions.MostRecent);
const sort = (option: SortOptions) => {
  selectedSortingOption.value = option;
  projectsList.value = sortItem(
    projectsList.value,
    { date: modifiedAtSorter, name: nameSorter },
    selectedSortingOption.value
  );
};

const domainDatacubesQueryString = ref('');
const projectsListDomainDatacubes = ref<DomainProject[]>([]);
const datasetsList = ref<DatasetInfo[]>([]);

const selectedDatacubeSortingOption = ref(SortOptions.MostRecent);
const setDatacubeSort = (option: SortOptions) => {
  selectedDatacubeSortingOption.value = option;
};

const selectedDataType = ref('models');
const setSelectedDataType = (type: string) => {
  selectedDataType.value = type;
};

const domainProjectStats = ref<{ [key: string]: any }>({});

const filteredProjects = computed(() =>
  projectsList.value.filter((project) =>
    project.name.toLowerCase().includes(projectListQueryString.value.toLowerCase())
  )
);

const filteredFamilyList = computed(() => {
  const familyList: DatacubeFamily[] =
    selectedDataType.value === 'models'
      ? projectsListDomainDatacubes.value.map((domainModel) => {
          const stats = domainProjectStats.value[domainModel.name];
          return {
            id: domainModel.id || '',
            name: domainModel.name || '',
            type: domainModel.type,
            numReady: stats && stats.READY ? stats.READY : 0,
            numDraft: stats && stats.REGISTERED ? stats.REGISTERED : 0,
            source:
              (domainModel.source ||
                (domainModel.maintainer && domainModel.maintainer[0]?.organization)) ??
              '',
            modified_at: domainModel.modified_at || domainModel.created_at || 0,
          };
        })
      : datasetsList.value.map((dataset) => ({
          id: dataset.data_id,
          name: dataset.name,
          type: 'dataset',
          numReady: dataset.indicator_count,
          numDraft: 0,
          source: dataset.source ?? '',
          modified_at: dataset.created_at,
        }));
  const filtered = familyList.filter((family) =>
    family.name.toLowerCase().includes(domainDatacubesQueryString.value.toLowerCase())
  );
  return sortItem(
    filtered,
    { date: modifiedAtSorter, name: nameSorter },
    selectedDatacubeSortingOption.value
  );
});
const refreshProjects = () => {
  projectService.getProjects().then((projects) => {
    projectsList.value = projects;
    projectsList.value = sortItem(
      projectsList.value,
      { date: modifiedAtSorter, name: nameSorter },
      SortOptions.MostRecent
    );
  });
};

const refreshDomainProjects = async () => {
  enableOverlay('Loading projects');
  domainProjectStats.value = await domainProjectService.getProjectsStats();

  const domainProjectSearchFields = {
    // DomainProjectFilterFields
    type: 'model',
  };
  const existingProjects: DomainProject[] = await domainProjectService.getProjects(
    domainProjectSearchFields
  );

  projectsListDomainDatacubes.value = existingProjects;

  const { data } = await API.get('maas/datacubes/datasets');
  datasetsList.value = data;

  disableOverlay();
};

onMounted(() => {
  refreshProjects();
  refreshDomainProjects();
});

const { enable: enableOverlay, disable: disableOverlay } = useOverlay();

const deleteProject = (project: Project) => {
  enableOverlay(`Deleting project '${project.name}'`);
  projectService.deleteProject(project.id).then(() => {
    disableOverlay();
    refreshProjects();
  });
};
const deleteDomainProject = (project: DomainProject) => {
  enableOverlay(`Deleting domain model project '${project.name}'`);
  domainProjectService.deleteProject(project.id ?? '').then(() => {
    disableOverlay();
    refreshDomainProjects();
  });
};

const router = useRouter();
const gotoNewProject = async () => {
  const id = await projectService.createProject('Untitled project', 'Project description');
  router.push({
    name: 'overview',
    params: { project: id, projectType: ProjectType.Analysis },
  });
};
const gotoNewFamilyProject = () => {
  router.push('newDomainProject');
};
</script>

<style lang="scss" scoped>
@import '~styles/variables';
$padding-size: 12.5vh;

.home-container {
  height: $content-full-height;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: var(--p-surface-50);
}

.columns {
  display: flex;
  flex: 1;
  min-height: 0;
  padding: 2rem;
  width: 100%;
  max-width: 1600px;
  gap: 20px;
}

.logo-container {
  width: 100%;
  margin-top: calc(calc(#{$padding-size} / 2) - 10px);
  text-align: center;

  .logo {
    height: $padding-size;
    position: relative;
    // Nudge the logo left a little to look more visually centered
    left: calc(-#{$padding-size} / 6);
  }

  .descriptions {
    font-size: x-large;
    text-align: center;
    margin-bottom: calc(calc(#{$padding-size} / 2) - 10px);
  }
}

.title {
  display: flex;
  align-items: center;
  margin-bottom: 2rem;

  h3 {
    flex: 1;
  }

  div {
    flex: 1;
  }
}

.projects-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;

  .projects-list-header {
    display: flex;
    align-items: flex-end;
    line-height: 20px;
    padding: 0.5rem 1rem;
    color: var(--p-text-muted-color);
    background: var(--p-surface-50);
    border-radius: var(--p-border-radius-sm);
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    // Add right padding to accommodate for scrollbar
    overflow: hidden;
    scrollbar-gutter: stable both-edges;
  }

  .projects-list-elements {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    scrollbar-gutter: stable both-edges;

    & > *:not(:first-child) {
      margin-top: 1px;
    }
  }
}

.table-column {
  flex: 1;
  min-width: 0;

  &:not(:first-child) {
    margin-left: 5px;
  }

  &.extra-wide {
    flex: 2;
  }

  &.extra-small {
    flex-grow: 0;
    flex-shrink: 0;
    flex-basis: 20px;
  }
}

.controls {
  display: flex;
  gap: 1rem;
}

.fixed-width-control {
  width: 20rem;
}

.flex-1 {
  flex: 1;
  min-width: 0;
}

.labelled-select {
  width: 100%;
}

.panel {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  position: relative;
}

:deep(.project-column) {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: absolute;
  inset: 0;
  padding: 2rem;
}
</style>
