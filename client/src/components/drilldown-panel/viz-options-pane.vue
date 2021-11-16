<template>
  <div class="breakdown-pane-container">

    <label class="label-header">Data</label>
    <div class="config-group">
      <dropdown-button
        class="dropdown-button"
        :inner-button-label="'Variable'"
        :items="modelOutputsDisplayNames"
        :selected-item="currentOutputDisplayName"
        @item-selected="setOutputVariable"
      />
      <dropdown-button
        class="dropdown-button"
        :inner-button-label="'Unit'"
        :items="unitOptions"
        :selected-item="selectedUnit"
        @item-selected="setUnitSelection"
      />
      <dropdown-button
        class="dropdown-button"
        :inner-button-label="'Aggregated by'"
        :items="aggregationOptions"
        :selected-item="selectedAggregation"
        @item-selected="setAggregationSelection"
      />
      <div style="font-size: small;">
        <a class="add-second-variable">
          <i class="fa fa-plus-circle"></i> add a second variable
        </a>
      </div>
    </div>

    <label class="label-header">Timeseries</label>
    <div class="config-group">
      <label>Resolution</label>
      <radio-button-group
        style="border-style: none"
        :selected-button-value="selectedResolution"
        :buttons="resolutionGroupButtons"
        @button-clicked="setResolutionSelection"
      />
    </div>

    <label class="label-header">Map</label>
    <div class="config-group">
      <label>Base layer</label>
      <radio-button-group
        style="border-style: none"
        :selected-button-value="selectedBaseLayer"
        :buttons="baseLayerGroupButtons"
        @button-clicked="setBaseLayerSelection"
      />
      <label>Blending into base layer:</label>
      <dropdown-button
        class="dropdown-button"
        :items="baseLayerTransparecyOptions"
        :selected-item="selectedTransparency"
        @item-selected="setTransparencySelection"
      />
      <label>Show data as</label>
      <radio-button-group
        style="border-style: none"
        :selected-button-value="selectedDataLayer"
        :buttons="dataLayerGroupButtons"
        @button-clicked="setDataLayerSelection"
      />
      <label>Color palette</label>
      <dropdown-button
        class="dropdown-button"
        :items="colorSchemes"
        :selected-item="selectedColorSchemeName"
        @item-selected="setColorSchemeSelection"
      />
      <div class="color-scale">
        <svg
          ref="colorPalette"
        />
      </div>
      <dropdown-button
        class="dropdown-button"
        :inner-button-label="'Scale'"
        :items="colorScaleGroupButtons"
        :selected-item="selectedColorScaleType"
        @item-selected="setColorScaleTypeSelection"
      />
      <button
        type="button"
        class="btn btn-default dropdown-button"
        @click="reverseColorScale">
          <i class="fa fa-arrows-h" />
          Reverse Scale
      </button>
      <div v-if="selectedColorScaleType === ColorScaleType.Discrete">
        <label>Number of bins: {{numberOfColorBins}}</label>
        <input
          type="range"
          style="margin-bottom: 1rem;"
          min="1"
          :max="maxNumberOfColorBins"
          step="1"
          ref="number-of-color-bins-slider"
          :value="numberOfColorBins"
          @change="updateNumberOfColorBins"
        />
        <label>Bins chosen so that</label>
        <dropdown-button
          class="dropdown-button"
          :items="['each bin has same range of values']"
          :selected-item="'each bin has same range of values'"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, ref, toRefs } from 'vue';
import DropdownButton from '@/components/dropdown-button.vue';
import { AggregationOption, TemporalResolutionOption } from '@/types/Enums';
import RadioButtonGroup from '@/components/widgets/radio-button-group.vue';
import { BASE_LAYER, BASE_LAYER_TRANSPARENCY, DATA_LAYER } from '@/utils/map-util-new';
import { DatacubeFeature, Model } from '@/types/Datacube';
import { mapActions, useStore } from 'vuex';
import { COLOR_SCHEMES, ColorScaleType, COLOR_SWATCH_SIZE } from '@/utils/colors-util';
import * as d3 from 'd3';

export default defineComponent({
  components: {
    DropdownButton,
    RadioButtonGroup
  },
  name: 'VizOptionsPane',
  props: {
    selectedAggregation: {
      type: String,
      default: AggregationOption.Mean
    },
    selectedUnit: {
      type: String,
      default: ''
    },
    selectedResolution: {
      type: String,
      default: TemporalResolutionOption.Month
    },
    aggregationOptions: {
      type: Array as PropType<AggregationOption[]>,
      default: []
    },
    selectedBaseLayer: {
      type: String,
      default: BASE_LAYER.DEFAULT
    },
    selectedDataLayer: {
      type: String,
      default: DATA_LAYER.ADMIN
    },
    selectedTransparency: {
      type: String,
      default: BASE_LAYER_TRANSPARENCY['50% Transparency']
    },
    colorSchemeReversed: {
      type: Boolean,
      default: false
    },
    selectedColorSchemeName: {
      type: String,
      default: Object.keys(COLOR_SCHEMES)[0]
    },
    selectedColorScaleType: {
      type: String,
      default: ColorScaleType.Discrete
    },
    numberOfColorBins: {
      type: Number,
      default: 5
    },
    selectedColorScheme: {
      type: Array as PropType<string[]>,
      default: COLOR_SCHEMES.DEFAULT
    },
    metadata: {
      type: Object as PropType<Model | null>,
      default: null
    }
  },
  emits: [
    'set-aggregation-selection',
    'set-unit-selection',
    'set-resolution-selection',
    'set-base-layer-selection',
    'set-data-layer-selection',
    'set-base-layer-transparency-selection',
    'set-color-scheme-reversed',
    'set-color-scheme-name',
    'set-color-scale-type',
    'set-number-color-bins'
  ],
  setup(props) {
    const {
      metadata
    } = toRefs(props);

    const capitalize = (str: string) => {
      return str[0].toUpperCase() + str.slice(1);
    };
    const resolutionGroupButtons = ref(Object.values(TemporalResolutionOption).filter(val => val.length > 0)
      .map(val => ({ label: capitalize(val), value: val })));
    const baseLayerGroupButtons = ref(Object.values(BASE_LAYER)
      .map(val => ({ label: capitalize(val), value: val })));
    const dataLayerGroupButtons = ref(Object.values(DATA_LAYER)
      .map(val => ({ label: capitalize(val), value: val })));

    const baseLayerTransparecyOptions = ref(Object.keys(BASE_LAYER_TRANSPARENCY)
      .map(key => ({ displayName: key, value: (BASE_LAYER_TRANSPARENCY as any)[key] })));

    const colorScaleGroupButtons = ref(Object.values(ColorScaleType)
      .map(val => ({ displayName: capitalize(val), value: val })));
    const colorSchemes = ref(Object.keys(COLOR_SCHEMES)
      .map(val => ({ displayName: val, value: val })));

    const store = useStore();
    const datacubeCurrentOutputsMap = computed(() => store.getters['app/datacubeCurrentOutputsMap']);
    const currentOutputIndex = computed(() => metadata.value?.id !== undefined ? datacubeCurrentOutputsMap.value[metadata.value?.id] : 0);

    const modelOutputs = computed<DatacubeFeature[]>(() => {
      const outputs = metadata.value?.validatedOutputs ? metadata.value?.validatedOutputs : metadata.value?.outputs;
      return outputs ?? [];
    });

    const modelOutputsDisplayNames = computed(() => {
      return modelOutputs.value.map(o => o.display_name);
    });

    const currentOutput = computed(() => {
      return modelOutputs.value[currentOutputIndex.value];
    });

    const currentOutputDisplayName = computed(() => {
      return currentOutput.value.display_name;
    });

    const unitOptions = computed<string[]>(() => {
      const unit = currentOutput.value.unit ?? '';
      return [unit];
    });

    return {
      resolutionGroupButtons,
      baseLayerGroupButtons,
      dataLayerGroupButtons,
      colorScaleGroupButtons,
      modelOutputsDisplayNames,
      currentOutputDisplayName,
      colorSchemes,
      ColorScaleType,
      baseLayerTransparecyOptions,
      unitOptions
    };
  },
  watch: {
    colorSchemeReversed() {
      this.renderColorScale();
    },
    selectedColorSchemeName() {
      this.renderColorScale();
    },
    selectedColorScaleType() {
      this.renderColorScale();
    },
    numberOfColorBins() {
      this.renderColorScale();
    },
    selectedColorScheme() {
      this.renderColorScale();
    }
  },
  computed: {
    maxNumberOfColorBins(): number {
      return (COLOR_SCHEMES as any)[this.selectedColorSchemeName].length;
    }
  },
  mounted() {
    this.renderColorScale();
  },
  methods: {
    ...mapActions({
      setDatacubeCurrentOutputsMap: 'app/setDatacubeCurrentOutputsMap'
    }),
    updateNumberOfColorBins() {
      const newVal = parseFloat(
        (this.$refs['number-of-color-bins-slider'] as HTMLInputElement).value
      );
      this.$emit('set-number-color-bins', newVal);
    },
    reverseColorScale() {
      this.$emit('set-color-scheme-reversed', !this.colorSchemeReversed);
    },
    setOutputVariable(variable: string) {
      const selectedOutputIndex = this.modelOutputsDisplayNames.indexOf(variable);
      // update the store so that other components can sync
      const defaultFeature = {
        [this.metadata?.id ?? '']: selectedOutputIndex
      };
      this.setDatacubeCurrentOutputsMap(defaultFeature);
    },
    setAggregationSelection(aggregation: string) {
      this.$emit('set-aggregation-selection', aggregation);
    },
    setUnitSelection(unit: string) {
      this.$emit('set-unit-selection', unit);
    },
    setResolutionSelection(resolution: string) {
      this.$emit('set-resolution-selection', resolution);
    },
    setBaseLayerSelection(baseLayer: string) {
      this.$emit('set-base-layer-selection', baseLayer);
    },
    setDataLayerSelection(dateLayer: string) {
      this.$emit('set-data-layer-selection', dateLayer);
    },
    setTransparencySelection(transparency: string) {
      this.$emit('set-base-layer-transparency-selection', transparency);
    },
    setColorScaleTypeSelection(colorScale: ColorScaleType) {
      this.$emit('set-color-scale-type', colorScale);
    },
    setColorSchemeSelection(colorScheme: string) {
      this.$emit('set-color-scheme-name', colorScheme);
    },
    renderColorScale() {
      const colors = this.selectedColorScheme;
      const n = colors.length;
      const width = this.selectedColorScaleType === ColorScaleType.Discrete ? (n * COLOR_SWATCH_SIZE) : n;
      const refSelection = d3.select((this.$refs as any).colorPalette);
      refSelection.selectAll('*').remove();
      refSelection
        .attr('viewBox', '0 0 ' + n + ' 1')
        .attr('preserveAspectRatio', 'none')
        .style('display', 'block')
        .style('width', width + 'px')
        .style('height', COLOR_SWATCH_SIZE + 'px')
      ;
      refSelection
        .selectAll('rect')
        .data(colors)
        .enter().append('rect')
        .style('fill', function(d) { return d; })
        .attr('x', function(d, i) { return i; })
        .attr('width', 1)
        .attr('height', 1);
    }
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.breakdown-pane-container {
  margin-bottom: 40px;
}

.dropdown-button {
  margin-bottom: 4px;
  width: max-content;
}

.add-second-variable {
  color: blue;
  cursor: pointer;
  margin-left: 2px;
  margin-right: 2px;
}

.config-group {
  padding-bottom: 1rem;
  display: flex;
  flex-direction: column;
}

label {
  font-weight: normal;
}

.label-header {
  font-weight: bold;
  font-size: medium;
}

.color-scale {
  padding-top: 1rem;
  padding-bottom: 1rem;
}

</style>
