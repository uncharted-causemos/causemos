<template>
  <div class="project-overview-container">
    <div class="logo-container">
      <img
        class="logo"
        src="../assets/causemos-logo-colour.svg"
        alt="CauseMos logo"
      >
    </div>
    <h3 class="header-prompt">Welcome to the domain {{datacubeType}} family page of <b>{{datacubeFamily}}</b></h3>
    <div class="row title">
      <div class="descriptions">
        Through this page, you can publish {{datacubeType}} instances and track insights.
      </div>
    </div>
    <div class="row projects-list">
      <div class="row projects-list-header">
        <div class="col-sm-4">
          Name
        </div>
        <div class="col-sm-4">
          # Source
        </div>
        <div class="col-sm-2">
          # Status
        </div>
        <div class="col-sm-2">
          Created At
        </div>
      </div>
      <div class="instances-list-elements">
        <div
          v-for="instance in datacubeInstances"
          :key="instance.id">
          <domain-datacube-instance-card
            :model="instance"
            @delete="deleteDatacubeInstance(instance)" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import DomainDatacubeInstanceCard from '@/components/domain-datacube-instance-card.vue';
import projectService from '@/services/domain-project-service';
import filtersUtil from '@/utils/filters-util';
import { getDatacubes, updateDatacube } from '@/services/new-datacube-service';
import { DatacubeStatus } from '@/types/Enums';

export default {
  name: 'DomainProjectOverview',
  components: {
    DomainDatacubeInstanceCard
  },
  data: () => ({
    datacubeFamily: '',
    datacubeType: '',
    datacubeInstances: []
  }),
  computed: {
    ...mapGetters({
      project: 'app/project'
    })
  },
  async mounted() {
    // first: fetch project info
    const projectInfo = await projectService.getProject(this.project);
    this.datacubeFamily = projectInfo.name;
    this.datacubeType = projectInfo.type;

    // then, fetch model instances
    const newFilters = filtersUtil.newFilters();
    // filtersUtil.addSearchTerm(newFilters, 'name', this.datacubeFamily, 'and', false);
    // filtersUtil.addSearchTerm(newFilters, 'type', 'model', 'and', false);
    const instances = await getDatacubes(newFilters);
    // FIXME: manaully allow overalapping models
    //  (e.g., old dssat and new dssat to be listed under the family name of dssat)
    this.datacubeInstances = instances.filter(i => i.name.includes(this.datacubeFamily));
  },
  methods: {
    ...mapActions({
      setProjectMetadata: 'app/setProjectMetadata'
    }),
    async deleteDatacubeInstance(instance) {
      // FIXME: for now, unpublish the model
      instance.status = DatacubeStatus.Registered;
      await updateDatacube(instance.id, instance);
    }
  }
};
</script>

<style lang="scss" scoped>

$padding-size: 12.5vh;
.project-overview-container {
  padding: $padding-size;
  padding-top: 0;
}

.logo-container {
  width: 100%;
  margin-top: calc(#{$padding-size / 2} - 10px);
  height: $padding-size;
  text-align: center;
}

.logo {
  height: 100%;
  position: relative;
  // Nudge the logo left a little to look more visually centered
  left: - $padding-size / 6;
}

.header-prompt {
  font-weight: normal;
  font-size: 28px;
  margin-top: 0;
  text-align: center;
}

.descriptions {
  display: flex;
  font-size: large;
}

.descriptions {
  margin: 3vh 0;

  & > p {
    color: #747576;
    width: 100%;
  }
}

.cards > .overview-card-container:not(:first-child),
.descriptions > p:not(:first-child) {
  margin-left: 6.25vh;
}

.projects-list {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
  .projects-list-header {
    box-sizing: border-box;
    border: 1px solid #bbb;
    margin: 1px 0;
    background: #fcfcfc;
    font-weight: bold;
    padding: 10px;
  }
  .projects-list-elements {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }
}

.title {
  display: flex;
  align-items: center;
  div {
    flex: 1;
  }
  .btn-primary {
    margin: 20px 5px 10px;
  }
}
</style>
