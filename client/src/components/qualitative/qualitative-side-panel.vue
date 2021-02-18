<template>
  <side-panel
    class="qualitative-side-panel-container"
    :tabs="tabs"
    :current-tab-name="activeTabName"
    :add-padding="true"
    @set-active="setActiveTab"
  >
    <div v-if="activeTabName === 'Update Belief Scores'">
      <p>
        The belief score for a relationship is an aggregated metric based on the amount of evidence,
        contradictory evidence, and other factors to provide an estimate of confidence in the relationship.
      </p>
      <p>
        These scores only apply to the current project,
        and may be updated to take any curations into account.
      </p>
      <button
        class="btn btn-primary btn-call-for-action"
        :disabled="isUpdatingBeliefScores"
        @click="updateBeliefScores"
      >
        {{ isUpdatingBeliefScores ? 'Updating' : 'Update' }}
        Belief Scores
      </button>
    </div>
  </side-panel>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import SidePanel from '@/components/side-panel/side-panel';
import messagesUtil from '@/utils/messages-util';
import API from '@/api/api';

const UPDATE_BELIEF_SCORE = messagesUtil.UPDATE_BELIEF_SCORE;

export default {
  name: 'QualitativeSidePanel',
  components: {
    SidePanel
  },
  data: () => ({
    activeTabName: ''
  }),
  computed: {
    ...mapGetters({
      project: 'app/project',
      isUpdatingBeliefScores: 'kb/isUpdatingBeliefScores',
      curationCounter: 'kb/curationCounter'
    }),
    tabs() {
      return [
        {
          name: 'Update Belief Scores',
          icon: this.isUpdatingBeliefScores ? 'fa fa-fw fa-spin fa-spinner' : null,
          imgSrc: this.isUpdatingBeliefScores ? null : 'colour-legend.png',
          isGreyscale: !this.isUpdatingBeliefScores && this.curationCounter === 0,
          badgeCount: this.curationCounter > 0 ? this.curationCounter : null
        }
      ];
    }
  },
  methods: {
    ...mapActions({
      resetCurationCounter: 'kb/resetCurationCounter',
      setIsUpdatingBeliefScores: 'kb/setIsUpdatingBeliefScores',
      setUpdateToken: 'app/setUpdateToken'
    }),
    setActiveTab(tab) {
      this.activeTabName = tab;
    },
    async updateBeliefScores() {
      this.setIsUpdatingBeliefScores(true);
      const result = await API.post(`projects/${this.project}/update-belief-score`);
      this.setIsUpdatingBeliefScores(false);
      if (result.status === 200) {
        this.toaster(UPDATE_BELIEF_SCORE.SUCCESSFUL_SUBMISSION, 'success', false);
        this.resetCurationCounter();
        this.setUpdateToken(result.data.updateToken);
        this.$emit('belief-scores-updated');
      } else {
        this.toaster(UPDATE_BELIEF_SCORE.ERRONEOUS_SUBMISSION, 'error', true);
      }
    }
  }
};
</script>

<style lang="scss" scoped>
  .qualitative-side-panel-container {
    margin-top: 10px;
  }

  p {
    margin-bottom: 20px;
  }
  button {
    margin: 0 auto;
    display: block;
  }
</style>
