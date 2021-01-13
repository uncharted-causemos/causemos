<template>
  <div
    class="analysis-container"
    :class="{'fullscreen-mode': isFocusedCardFullscreen}"
  >
    <div
      class="header"
      :class="{ 'no-filters': activeFilters.length === 0 }"
    >
      <b><i class="fa fa-filter" /> Filter regions where: </b>
      <span
        v-for="(filter, index) of activeFilters"
        :key="index"
      >
        <span v-if="index > 0"> and </span>
        <span class="badge badge-default">{{ filter.name }}: <b>{{ filter.min }}</b> to <b>{{ filter.max }}</b></span>
      </span>
    </div>
    <div class="cards-container">
      <data-analysis-card
        v-for="item in analysisItems"
        :key="item.id"
        class="card-box"
        :class="{'isFullscreen': item.isFocused}"
        :data="item"
        :is-focused-card-fullscreen="isFocusedCardFullscreen"
        @toggle-fullscreen="toggleFullscreen(item)"
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

export default {
  name: 'Analysis',
  components: {
    DataAnalysisCard
  },
  props: {
    isFocusedCardFullscreen: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    ...mapGetters({
      analysisId: 'dataAnalysis/analysisId',
      timeSelectionSyncing: 'dataAnalysis/timeSelectionSyncing',
      analysisItems: 'dataAnalysis/analysisItems',
      focusedItem: 'dataAnalysis/focusedItem'
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
      if (_.isEqual(oldVal, newVal)) return;
      // TODO: if a card is fullscreen, sync with its selected time
      //  else, sync with the first card's selected time
      // if (newVal && this.focusedSelection && this.focusedSelection.timestamp) {
      //   // sync with the selected time of currently focused data
      //   this.updateAllTimeSelection(this.focusedSelection.timestamp);
      // }
      console.log('TODO: time selection syncing');
    },
    analysisItems() {
      this.captureThumbnail();
    }
  },
  methods: {
    ...mapActions({
      setTimeSelectionSyncing: 'dataAnalysis/setTimeSelectionSyncing',
      updateAllTimeSelection: 'dataAnalysis/updateAllTimeSelection',
      setFocusedItem: 'dataAnalysis/setFocusedItem'
    }),
    toggleFullscreen(cardData) {
      this.setFocusedItem(cardData.id);
      if (this.isFocusedCardFullscreen) {
        this.$emit('setFocusedCardFullscreen', false);
        return;
      }
      this.$emit('setFocusedCardFullscreen', true);
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
@import "~styles/wm-theme/wm-theme";

$fullscreenTransition: all .5s ease-in-out;

.analysis-container {
  background-color: $background-light-1;
  padding: 10px;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;

  .header {
    transition: $fullscreenTransition;
    padding-bottom: 10px;
    // This needs an explicit height instead of `auto` for the transition animation to work.
    height: 36px;
    overflow: auto;
    line-height: 24px;
    .badge {
      font-weight: normal;
      border-radius: 3px;
      padding: 5px;
      position: relative;
      bottom: 1px; // align baselines better
    }
  }

  .cards-container {
    transition: $fullscreenTransition;
    align-content: space-between;
    overflow-y: auto;
    position: relative;
    display: flex;
    width: 100%;
    flex: 1;
    flex-flow: wrap;
  }

  .card-box {
    transition: $fullscreenTransition, border-color 0s;
    margin: 0 5px 0 0;
    border: 1px solid #CACBCC;
    border-radius: 3px;
    overflow: hidden;
    height: calc(calc(100% - 5px) / 2);
    flex: 0 1 calc(calc(100% - 10px) / 3);
    &:nth-child(3n) {
      margin-right: 0;
    }
  }
}

.analysis-container.fullscreen-mode .header,
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

    &:not(.isFullscreen) {
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
