<template>
  <div class="data-analysis-input-panel-container">
    <div ref="facetContainer" />
  </div>
</template>

<script>
import Facet from '@uncharted.software/stories-facets';
import { getModelRuns, getModelParameters } from '@/services/datacube-service';
import { StoriesFacetsBuilder, PARAMETER_TYPES, FACET_TYPES } from '@/utils/data/ParameterFacetsBuilder';

const PARAMETER_FACETS_MAPPING = Object.freeze({
  [PARAMETER_TYPES.ChoiceParameter]: FACET_TYPES.KEYWORD,
  [PARAMETER_TYPES.NumberParameter]: FACET_TYPES.BAR, // HISTOGRAM OR FACET_TYPES.BAR works
  [PARAMETER_TYPES.TimeParameter]: FACET_TYPES.BAR
});

const EVENTS = Object.freeze({
  RUNS_UPDATED: 'runsupdated'
});
export default {
  name: 'AnalysisInputPanel',
  components: {
  },
  props: {
    modelId: {
      type: String,
      required: true
    },
    outputVariable: {
      type: String,
      required: true
    }
  },
  data: () => ({
    facets: null,
    facetsBuilder: null,
    facetsSelection: {} // TODO: store input facets selection state for each output variable (datacube) in the vuex store
  }),
  computed: {
    outputId() {
      return `${this.modelId}:${this.outputVariable}`;
    }
  },
  watch: {
    outputId() {
      this.fetchRunParameterFacets(this.modelId);
    }
  },
  mounted() {
    this.facets = new Facet(this.$refs.facetContainer, []);
    this.facetsBuilder = new StoriesFacetsBuilder();
    this.registerFacetsHandler();
    this.fetchRunParameterFacets(this.modelId);
  },
  destroyed() {
    this.facets.destroy();
    this.facets = null;
    this.facetsBuilder = null;
  },
  methods: {
    applyFacetsSelection() {
      const selections = this.facetsSelection;
      const filters = Object.entries(selections).map(([paramName, selection]) => {
        const { fromValue, toValue, keyword } = selection;
        const filter = keyword ? { paramName, keyword } : { paramName, range: [fromValue, toValue] };
        return filter;
      });
      // Apply filters and build selection facets
      const selection = this.facetsBuilder
        .applyFilters(filters)
        .build()
        .toFacetsSelection();
      // Add selected range bar handle to each of the range facets
      selection.forEach((selection) => {
        const range = selections[selection.key];
        if (range) {
          const { from, to } = range;
          selection.facets && selection.facets[0] && selection.facets[0].selection && (selection.facets[0].selection.range = { from, to });
        }
      });
      this.facets.select(selection);
      // Highlight selected keyword facets
      const highlights = Object.entries(selections)
        .filter(([, selection]) => (selection.keyword !== undefined))
        .map(([key, selection]) => ({ key, value: selection.keyword }));
      this.facets.highlight(highlights);
      this.$emit(EVENTS.RUNS_UPDATED, this.facetsBuilder.runs());
    },
    registerFacetsHandler() {
      this.facets.on('facet:click', (event, key, keyword) => {
        const selection = this.facetsSelection[key];
        if (selection) {
          this.facets.unhighlight([{ key }]);
        }
        if (selection && selection.keyword === keyword) {
          delete this.facetsSelection[key];
        } else {
          this.facetsSelection[key] = { keyword };
        }
        this.applyFacetsSelection();
      });
      this.facets.on('facet-histogram:click', (event, key, range) => {
        this.facetsSelection[key] = {
          from: range.label[0],
          to: range.toLabel[range.toLabel.length - 1],
          fromValue: range.metadata[0].range[0],
          toValue: range.metadata[range.metadata.length - 1].range[1]
        };
        this.applyFacetsSelection();
      });
      this.facets.on('facet-histogram:rangechangeduser', (event, key, range) => {
        this.facetsSelection[key] = {
          from: range.from.label[0],
          to: range.to.label[range.to.label.length - 1],
          fromValue: range.from.metadata[0].range[0],
          toValue: range.to.metadata[range.to.metadata.length - 1].range[1]
        };
        this.applyFacetsSelection();
      });
    },
    async fetchRunParameterFacets(modelId) {
      const [runs, parameters] = (await Promise.all([
        getModelRuns(modelId),
        getModelParameters(modelId)
      ]));
      const facets = this.facetsBuilder.reset(runs, parameters, { paramterFacetMapping: PARAMETER_FACETS_MAPPING }).build().toFacetsGroups();
      this.facets.replace(facets);
      this.facetsSelection = {};
      this.$emit(EVENTS.RUNS_UPDATED, this.facetsBuilder.runs());
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";
@import "~styles/wm-theme/wm-theme";
.data-analysis-input-panel-container {
  overflow: auto;

  /deep/ .facets-group {
    box-shadow: none;
    background: $background-light-2;
    padding: 5px 0;
  }

  /deep/.facets-group-container {
    margin-bottom: 5px;
    // Padding so the facet border isn't pressed right against the scrollbar
    padding: 0 5px;
    background-color: transparent;
  }

  // Remove 'Oswald' font
  /deep/ .group-header,
  /deep/ .facet-label,
  /deep/ .facet-label-count {
    font-family: inherit;
  }

  /deep/ .facet-label-count {
    font-size: $font-size-large;
    top: -4px;
    position: relative;
  }

  // Remove 'box-shadow' transition which is used to darken the bar on hover
  //  since the transition felt slow and less snappy
  /deep/ .facets-facet-vertical .facet-bar-base {
    transition: width .4s, opacity 0.5s;
  }
}
</style>
