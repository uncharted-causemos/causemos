<template>
  <button
    v-tooltip.right="'Update Belief Scores'"
    type="button"
    class="btn"
    @click="onClick"
  >
    <i
      v-if="isUpdatingBeliefScores"
      class="fa fa-fw fa-spin fa-spinner"
    />
    <img
      v-else
      :class="{'has-badge': curationCounter > 0}"
      src="../assets/colour-legend.png"
    >
    <span
      v-if="curationCounter > 0"
      class="badge"
    >
      {{ curationCounter }}
    </span>
  </button>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'BeliefScoreActionButton',
  computed: {
    ...mapGetters({
      curationCounter: 'kb/curationCounter',
      isUpdatingBeliefScores: 'kb/isUpdatingBeliefScores'
    })
  },
  methods: {
    onClick() {
      this.$emit('click');
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";

img {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40%;
  height: 40%;
  filter: grayscale(100%);

  &.has-badge {
    filter: none;
  }
}

.badge {
  position: absolute;
  left: $navbar-outer-width / 2;
  bottom: $navbar-outer-width / 2;
  top: auto;
}
</style>
