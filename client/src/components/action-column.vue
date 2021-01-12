<template>
  <div class="action-column-container">
    <belief-score-action-button
      :class="{ active: showDetailsPanel }"
      @click="onBeliefScoreActionClick"
    />
    <div
      v-if="showDetailsPanel"
      class="details-panel"
    >
      <div class="panel-header">
        <h5>Update Belief Scores</h5>
      </div>
      <close-button @click="closeDetailsPanel" />
      <hr class="pane-separator">
      <div class="panel-body">
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
    </div>
  </div>
</template>

<script>

import { mapGetters, mapActions } from 'vuex';
import dateFormatter from '@/filters/date-formatter';

import API from '@/api/api';

import BeliefScoreActionButton from '@/components/belief-score-action-button';
import CloseButton from '@/components/widgets/close-button';
import messagesUtil from '@/utils/messages-util';

const UPDATE_BELIEF_SCORE = messagesUtil.UPDATE_BELIEF_SCORE;


export default {
  name: 'ActionColumn',
  components: {
    BeliefScoreActionButton,
    CloseButton
  },
  data: () => ({
    showDetailsPanel: false
  }),
  computed: {
    ...mapGetters({
      project: 'app/project',
      currentView: 'app/currentView',
      isUpdatingBeliefScores: 'kb/isUpdatingBeliefScores'
    }),
    cagListEntries() {
      return this.cagList.map(cag => ({
        id: cag.id,
        title: cag.name,
        subtitle: dateFormatter(cag.modified_at, 'MMM DD, YYYY')
      }));
    }
  },
  methods: {
    ...mapActions({
      resetCurationCounter: 'kb/resetCurationCounter',
      setIsUpdatingBeliefScores: 'kb/setIsUpdatingBeliefScores',
      setUpdateToken: 'app/setUpdateToken'
    }),
    onBeliefScoreActionClick() {
      this.showDetailsPanel = !this.showDetailsPanel;
    },
    closeDetailsPanel() {
      this.showDetailsPanel = false;
    },
    async updateBeliefScores() {
      this.setIsUpdatingBeliefScores(true);
      const result = await API.post(`projects/${this.project}/update-belief-score`);
      if (result.status === 200) {
        this.toaster(UPDATE_BELIEF_SCORE.SUCCESSFUL_SUBMISSION, 'success', false);
        this.resetCurationCounter();
        this.setIsUpdatingBeliefScores(false);
        this.setUpdateToken(result.data.updateToken);
        this.$emit('belief-scores-updated');
      } else {
        this.toaster(UPDATE_BELIEF_SCORE.ERRONEOUS_SUBMISSION, 'error', true);
        this.setIsUpdatingBeliefScores(false);
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";
@import "~styles/wm-theme/wm-theme";

.action-column-container {
  position: relative;
  width: $navbar-outer-width;
  height: $content-full-height;
  background-color: #EAEBEC;
  border: 1px solid $separator;
  & > .btn {
    background-color: transparent;
    width: $navbar-outer-width;
    height: $navbar-outer-width;
    position: relative;

    &.active {
      background-color: #ccc;
    }
  }
}

.details-panel {
  height: $content-full-height;
  width: 20vw;
  background-color: $color-background-lvl-2;
  position: absolute;
  left: 100%;
  top: 0;
  z-index: map-get($z-index-order, side-panel);
  box-shadow: 0 -1px 0 #e5e5e5, 0 0 2px rgba(0,0,0,.12), 2px 2px 4px rgba(0,0,0,.24);
}

.panel-header {
  height: 56px; // 56px = 32px button + (2 * 12px) padding above and below
  display: flex;
  align-items: center;
  padding: 0 20px;
  justify-content: space-between;

  h5 {
    margin: 0;
    line-height: 18px;
  }
}

.panel-body {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  overflow-y: auto;
  p {
    margin-bottom: 20px;
  }
  button {
    align-self: center;
  }
}

</style>
