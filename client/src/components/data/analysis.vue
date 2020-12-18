<template>
  <div
    class="analysis-container h-100 flex flex-col"
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
    <div class="split-container flex flex-row flex-grow-1 h-0">
      <data-analysis-control-panel
        v-if="focusedItem"
        class="control-panel"
        :data="focusedItem"
      />
      <div class="cards-container flex-grow-1 w-0 flex flex-row flex-wrap">
        <!-- Rerender when card index changes. This is needed because when focused card is put back to the list, it needs to re-render -->
        <data-analysis-card
          v-for="item in analysisItems"
          :key="item.id"
          class="card-box"
          :class="{ isFocused: item.isFocused }"
          :data="item"
          :is-focused-card-fullscreen="isFocusedCardFullscreen"
          @click="onCardSelect(item)"
          @toggle-fullscreen="toggleFullscreen(item)"
          @on-map-load="onMapLoad(item.id)"
        />
      </div>
    </div>
  </div>
</template>

<script>
import _ from 'lodash';
import { mapActions, mapGetters } from 'vuex';
import DataAnalysisCard from '@/components/data/analysis-card';
import DataAnalysisControlPanel from '@/components/data/analysis-control-panel';
import html2canvas from 'html2canvas';
import { updateAnalysis } from '@/services/analysis-service';
import { chartValueFormatter } from '@/utils/string-util';

export default {
  name: 'Analysis',
  components: {
    DataAnalysisCard,
    DataAnalysisControlPanel
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
    focusedSelection() {
      return this.focusedItem && this.focusedItem.selection;
    },
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
      if (newVal && this.focusedSelection && this.focusedSelection.timestamp) {
        // sync with the selected time of currently focused data
        this.updateAllTimeSelection(this.focusedSelection.timestamp);
      }
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
    onCardSelect(data) {
      this.setFocusedItem(data.id);
    },
    toggleFullscreen(cardData) {
      if (this.isFocusedCardFullscreen) {
        this.$emit('setFocusedCardFullscreen', false);
        return;
      }
      this.onCardSelect(cardData);
      this.$emit('setFocusedCardFullscreen', true);
    },
    captureThumbnail: _.throttle(async function() {
      // Generate a thumbnail at most 1 second after function is called, ignoring multiple calls
      try {
        const el = this.$el.querySelector('.split-container');
        const thumbnailSource = (await html2canvas(el, { scale: 0.5 })).toDataURL();
        await updateAnalysis(this.analysisId, {
          thumbnail_source: thumbnailSource
        });
      } catch (e) {
        console.error('Error occurred when generating thumbnail for analysis:', e);
      }
    }, 1000, { trailing: true, leading: false }),
    onMapLoad(itemId) {
      if (!this.focusedItem.id || itemId === this.focusedItem.id) {
        this.captureThumbnail();
      }
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

  .control-panel {
    transition: $fullscreenTransition;
    overflow: hidden;
  }

  .cards-container {
    transition: $fullscreenTransition;
    align-content: space-between;
    padding-left: 10px;
    overflow-y: auto;
    position: relative;
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

    &.isFocused {
      border-color: $selected;
      -webkit-box-shadow: 0 0 7px $selected;
      -moz-box-shadow: 0 0 7px $selected;
      box-shadow: 0 0 7px $selected;
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
  .control-panel {
    width: 0;
    min-width: 0;
    padding: 0;
    border-width: 0;
  }

  .cards-container {
    padding: 0;
  }

  .card-box {
    flex-basis: 100%;
    height: 100%;
    flex-grow: 1;
    margin: 0;

    &:not(.isFocused) {
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
