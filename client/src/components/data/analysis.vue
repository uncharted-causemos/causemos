<template>
  <div
    class="analysis-container"
    :class="{'fullscreen-mode': fullscreenCardId !== null}"
  >
    <div
      class="header"
      :class="{ 'no-filters': activeFilters.length === 0 }"
    >
      <span><i class="fa fa-filter filter-icon" />Filter regions where </span>
      <span
        v-for="(filter, index) of activeFilters"
        :key="index"
      >
        <span v-if="index > 0"> and </span>
        <badge class="region-filter">
          <span>{{ filter.name }}: <strong>{{ filter.min }}</strong> to <strong>{{ filter.max }}</strong></span>
        </badge>
      </span>
    </div>
    <div class="cards-container">
      <data-analysis-card
        v-for="item in analysisItems"
        :key="item.id"
        class="card-box"
        :class="[
          item.id === fullscreenCardId ? 'is-fullscreen' : '',
          `card-count-${analysisItems.length}`
        ]"
        :data="item"
        :is-fullscreen="item.id === fullscreenCardId"
        @set-card-fullscreen="setCardFullscreen"
        @on-map-load="onMapLoad(item.id)"
      />
    </div>
  </div>
</template>

<script>
import _ from 'lodash';
import { mapActions, mapGetters } from 'vuex';
import DataAnalysisCard from '@/components/data/analysis-card';
import html2canvas from 'html2canvas';
import { updateAnalysis } from '@/services/analysis-service';
import { chartValueFormatter } from '@/utils/string-util';
import Badge from '../widgets/badge.vue';

export default {
  name: 'Analysis',
  components: {
    DataAnalysisCard,
    Badge
  },
  props: {
    fullscreenCardId: {
      type: String,
      default: null
    }
  },
  computed: {
    ...mapGetters({
      analysisId: 'dataAnalysis/analysisId',
      timeSelectionSyncing: 'dataAnalysis/timeSelectionSyncing',
      analysisItems: 'dataAnalysis/analysisItems'
    }),
    activeFilters() {
      const filterStrings = this.analysisItems
        .filter(item => item.filter && item.filter.global)
        .map(({ outputVariable, filter }) => {
          const valueFormatter = chartValueFormatter(filter.range.min, filter.range.max);
          return {
            name: outputVariable,
            min: valueFormatter(filter.range.min),
            max: valueFormatter(filter.range.max)
          };
        });
      return filterStrings;
    }
  },
  watch: {
    timeSelectionSyncing(newVal, oldVal) {
      if (
        newVal === false || _.isEqual(oldVal, newVal) || this.analysisItems.length === 0
      ) return;
      // If a card is fullscreen, sync with its selected time
      //  else, sync with the first card's selected time
      let timestampToFocus = this.analysisItems[0].selection.timestamp;
      if (this.fullscreenCardId !== null) {
        const fullscreenCard = this.analysisItems
          .find(item => item.id === this.fullscreenCardId);
        if (fullscreenCard && fullscreenCard.selection.timestamp) {
          timestampToFocus = fullscreenCard.selection.timestamp;
        }
      }
      this.updateAllTimeSelection(timestampToFocus);
    },
    analysisItems() {
      this.captureThumbnail();
    }
  },
  methods: {
    ...mapActions({
      setTimeSelectionSyncing: 'dataAnalysis/setTimeSelectionSyncing',
      updateAllTimeSelection: 'dataAnalysis/updateAllTimeSelection'
    }),
    setCardFullscreen(cardId) {
      this.$emit('set-card-fullscreen', cardId);
    },
    captureThumbnail: _.throttle(async function() {
      // Generate a thumbnail at most 1 second after function is called, ignoring multiple calls
      try {
        const el = this.$el.querySelector('.cards-container');
        const thumbnailSource = (await html2canvas(el, { scale: 0.5 })).toDataURL();
        await updateAnalysis(this.analysisId, {
          thumbnail_source: thumbnailSource
        });
      } catch (e) {
        console.error('Error occurred when generating thumbnail for analysis:', e);
      }
    }, 1000, { trailing: true, leading: false }),
    onMapLoad() {
      this.captureThumbnail();
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.analysis-container {
  padding: 10px;
  min-width: 0;
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;

  .header {
    transition: all $layout-transition;
    padding-bottom: 10px;
    // This needs an explicit height instead of `auto` for the transition animation to work.
    height: 36px;
    overflow: auto;
    line-height: 24px;

    .filter-icon {
      margin-right: 5px;
      color: $selected;
    }

    .region-filter {
      position: relative;
      bottom: 1px; // align baselines better
    }
  }

  .cards-container {
    transition: all $layout-transition;
    align-content: space-between;
    position: relative;
    display: flex;
    width: 100%;
    flex: 1;
    flex-flow: wrap;
  }

  .card-box {
    transition: all $layout-transition;
    margin: 0 5px 0 0;
    border-radius: 3px;
    overflow: hidden;
    height: 100%;
    flex-shrink: 1;
    flex-grow: 1;
    flex-basis: 0;
    &:last-child {
      margin-right: 0;
    }

    // If there are > 3 cards,
    //  split into two rows
    &.card-count-4,
    &.card-count-5,
    &.card-count-6 {
      height: calc(calc(100% - 5px) / 2);
    }

    &.card-count-4 {
      // Each card should take half the available width
      flex-basis: calc(calc(100% - 5px) / 2);

      &:nth-child(2) {
        margin-right: 0;
      }
    }

    &.card-count-5,
    &.card-count-6 {
      // Each card should take up a third of the available width
      flex-basis: calc(calc(100% - 10px) / 3);
      // If there are only two cards on the bottom row,
      //  don't expand them to be larger than the top row cards
      flex-grow: 0;

      &:nth-child(3) {
        margin-right: 0;
      }
    }

  }
}

.header.no-filters {
  height: 0;
  opacity: 0;
  padding: 0;
}

.analysis-container.fullscreen-mode {

  .card-box {
    flex-basis: 100%;
    height: 100%;
    flex-grow: 1;
    margin: 0;

    &:not(.is-fullscreen) {
      flex-basis: 0;
      height: 0;
      padding: 0;
      border-width: 0;
      min-width: 0;
      min-height: 0;
    }
  }
}
</style>
