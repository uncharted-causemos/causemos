<template>
  <div class="project-overview-container">
    <div class="logo-container">
      <img
        class="logo"
        src="../assets/causemos-logo-colour.svg"
        alt="CauseMos logo"
      >
    </div>
    <h3 class="header-prompt">What do you want to do?</h3>
    <div class="descriptions">
      <p>
        Analyze geo-temporal data cubes of
        <strong>expert model output</strong> and
        <strong>indicators</strong> to
        <strong>get fine-grained answers over time and space</strong>.
      </p>
      <p>
        Leverage automatically
        <strong>extracted knowledge</strong> to quickly
        <strong>assemble qualitative models</strong>
        that deepen understanding of the dynamics of a complex situation.
      </p>
      <p>
        Quantify qualitative models to
        <strong>investigate what-if scenarios</strong>
        and better understand the resulting
        <strong>system dynamics over time</strong>.
      </p>
    </div>
    <div class="cards">
      <overview-card
        v-for="(card, index) of cardData"
        :key="index"
        :icon="card.icon"
        :title="card.title"
        :metrics="card.metrics"
        @click="onClickCard(card.navigateTo)"
      />
    </div>
    <div>
      <br>
      <button
        class="button"
        @click="showDocumentModal=true">Add Documents
      </button>
    </div>
    <modal-upload-document
      v-if="showDocumentModal === true"
      @close="showDocumentModal = false" />
  </div>
</template>

<script>
import OverviewCard from '@/components/project-overview/overview-card';
import { mapGetters, mapActions } from 'vuex';
import { getModelDatacubesCount, getIndicatorDatacubesCount } from '@/services/datacube-service';
import modelService from '@/services/model-service';
import projectService from '@/services/project-service';
import ModalUploadDocument from '@/components/modals/modal-upload-document';
import { ProjectType } from '@/types/Enums';

export default {
  name: 'ProjectOverview',
  components: {
    OverviewCard,
    ModalUploadDocument
  },
  data: () => ({
    relationshipCount: undefined,
    modelCount: undefined,
    modelOutputVariableCount: undefined,
    indicatorCount: undefined,
    showDocumentModal: false,
    showReadersModal: false
  }),
  computed: {
    ...mapGetters({
      documentsCount: 'kb/documentsCount',
      project: 'app/project'
    }),
    cardData() {
      return [
        {
          icon: 'fa-table',
          title: 'Data',
          navigateTo: 'dataStart',
          metrics: [
            {
              name: 'Indicators',
              value: this.indicatorCount
            },
            {
              name: 'Model Output Variables',
              value: this.modelOutputVariableCount
            }
          ]
        },
        {
          icon: 'fa-book',
          title: 'Knowledge',
          navigateTo: 'qualitativeStart',
          metrics: [
            {
              name: 'Documents',
              value: this.documentsCount
            },
            {
              name: 'Causal Relationships',
              value: this.relationshipCount
            }
          ]
        },
        {
          icon: 'fa-connectdevelop',
          title: 'Models',
          navigateTo: 'quantitativeStart',
          metrics: [
            {
              name: 'Semi-Quantitative Models',
              value: this.modelCount
            }
          ]
        }
      ];
    }
  },
  async mounted() {
    // Fetch model count
    // FIXME: might be worth creating a more lightweight endpoint, or add this
    //  stat to the count-stats call above
    const fetchModels = modelService.getProjectModels(this.project);

    this.modelOutputVariableCount = await getModelDatacubesCount();
    this.indicatorCount = await getIndicatorDatacubesCount();

    // Handle document count and relationship count result
    let result = await projectService.getProjectStats(this.project);
    this.setDocumentsCount(result.documentsCount || 0);
    this.relationshipCount = result.relationshipsCount || 0;

    // Handle model result
    result = await fetchModels;
    this.modelCount = result.models
      ? result.models.length
      : 0;
  },
  methods: {
    ...mapActions({
      setDocumentsCount: 'kb/setDocumentsCount'
    }),
    onClickCard(navigateTo) {
      this.$router.push({
        name: navigateTo,
        params: {
          project: this.project,
          projectType: ProjectType.Analysis
        }
      });
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
}

.descriptions, .cards {
  display: flex;
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
</style>
