<template>
  <div class="breakdown-pane-container">

    <div class="config-group">
      <label class="label-header">Data</label>
      <div class="config-sub-group">
        <dropdown-button
          class="dropdown-button"
          :is-dropdown-left-aligned="true"
          :inner-button-label="'Variable'"
          :items="modelOutputsDisplayNames"
          :selected-item="currentOutputDisplayName"
          @item-selected="setOutputVariable"
        />
        <dropdown-button
          class="dropdown-button"
          :is-dropdown-left-aligned="true"
          :inner-button-label="'Unit'"
          :items="unitOptions"
          :selected-item="selectedUnitOption"
          @item-selected="setTransformSelection"
        />
        <div class="aggregation-row">
          <dropdown-button
            v-if="!shouldShowAdvancedAggregation"
            class="dropdown-button"
            :class="{ 'invalid-option': selectedSpatialAggregation === AggregationOption.None}"
            :is-dropdown-left-aligned="true"
            :inner-button-label="'Aggregated by'"
            :items="aggregationOptions"
            :selected-item="selectedSpatialAggregation"
            @item-selected="setAggregationSelection"
          />
          <dropdown-button
            v-else
            class="dropdown-button"
            :class="{ 'invalid-option': selectedSpatialAggregation === AggregationOption.None}"
            :is-dropdown-left-aligned="true"
            :inner-button-label="'Spatial aggregation'"
            :items="aggregationOptions"
            :selected-item="selectedSpatialAggregation"
            @item-selected="setSpatialAggregationSelection"
          />
          <button class="btn btn-sm default-btn" @click="toggleAdvancedAggregation">
            {{ shouldShowAdvancedAggregation ? 'Use a single function ' : 'Use advanced aggregations' }}
          </button>
        </div>
        <dropdown-button
          v-if="shouldShowAdvancedAggregation"
          class="dropdown-button"
          style="margin-top: 5px"
          :class="{ 'invalid-option': selectedTemporalAggregation === AggregationOption.None}"
          :is-dropdown-left-aligned="true"
          :inner-button-label="'Temporal aggregation'"
          :items="aggregationOptions"
          :selected-item="selectedTemporalAggregation"
          @item-selected="setTemporalAggregationSelection"
        />
      </div>
    </div>

    <div class="config-group">
      <label class="label-header">Timeseries</label>
      <div class="config-sub-group">
        <label
          class="header-secondary"
          :class="{ 'invalid-option': selectedResolution === TemporalResolutionOption.None}"
        >
          Aggregated up to
        </label>
        <radio-button-group
          :selected-button-value="selectedResolution"
          :buttons="resolutionGroupButtons"
          @button-clicked="setResolutionSelection"
        />
        <label class="temporal-res-note" v-if="isDotMapSelected">Using raw data resolution. Timeseries data is not temporally aggregated when Dot map is used.</label>
      </div>
    </div>

    <div class="config-group">
      <label class="label-header">Map</label>
      <div class="config-sub-group">
        <label class="header-secondary">Base</label>
        <radio-button-group
          :selected-button-value="selectedBaseLayer"
          :buttons="baseLayerGroupButtons"
          @button-clicked="setBaseLayerSelection"
        />
      </div>
      <div class="config-sub-group">
        <label class="header-secondary">Show data as</label>
        <radio-button-group
          :selected-button-value="selectedDataLayer"
          :buttons="dataLayerGroupButtons"
          @button-clicked="setDataLayerSelection"
        />
        <dropdown-button
          class="dropdown-button"
          :is-dropdown-left-aligned="true"
          :items="dataLayerTransparencyOptions"
          :selected-item="selectedDataLayerTransparency"
          :inner-button-label="'Opacity'"
          @item-selected="setTransparencySelection"
        />
      </div>

      <div class="config-sub-group">
        <label class="header-secondary">Color palette</label>
        <dropdown-button
          class="dropdown-button"
          :is-dropdown-left-aligned="true"
          :items="colorSchemes"
          :selected-item="selectedColorSchemeName"
          @item-selected="setColorSchemeSelection"
        />
        <svg ref="colorPalette" />
        <dropdown-button
          class="dropdown-button"
          :is-dropdown-left-aligned="true"
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
      </div>

      <div
        v-if="isDiscreteScale(selectedColorScaleType)"
        class="config-sub-group"
      >
        <label class="header-secondary">Number of bins: {{numberOfColorBins}}</label>
        <input
          type="range"
          style="margin-bottom: 1rem;"
          min="2"
          :max="maxNumberOfColorBins"
          step="1"
          ref="number-of-color-bins-slider"
          :value="numberOfColorBins"
          @change="updateNumberOfColorBins"
        />
        <label class="header-secondary">Bins chosen so that</label>
        <dropdown-button
          class="dropdown-button"
          :is-dropdown-left-aligned="true"
          :items="['each bin has same range of values']"
          :selected-item="'each bin has same range of values'"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import * as d3 from 'd3';
import { computed, defineComponent, PropType, ref, toRefs, watchEffect } from 'vue';
import DropdownButton, { DropdownItem } from '@/components/dropdown-button.vue';
import { AggregationOption, TemporalResolutionOption, DataTransform } from '@/types/Enums';
import RadioButtonGroup from '@/components/widgets/radio-button-group.vue';
import { BASE_LAYER, DATA_LAYER_TRANSPARENCY, DATA_LAYER } from '@/utils/map-util-new';
import { DatacubeFeature, Model } from '@/types/Datacube';
import { useStore } from 'vuex';
import { COLOR_SCHEME, ColorScaleType, COLOR, COLOR_PALETTE_SIZE, isDiscreteScale } from '@/utils/colors-util';
import { getOutputs } from '@/utils/datacube-util';
import { updateDatacubesOutputsMap } from '@/utils/analysis-util';
import { useRoute } from 'vue-router';
import useActiveDatacubeFeature from '@/services/composables/useActiveDatacubeFeature';
import { capitalize } from '@/utils/string-util';

const COLOR_SCHEMES = _.pick(COLOR_SCHEME, [COLOR.DEFAULT, COLOR.VEGETATION, COLOR.WATER, COLOR.RDYLBU_7, COLOR.OTHER]);
const TRANSFORMS: DropdownItem[] = [
  { value: DataTransform.PerCapita, displayName: 'Per Capita' },
  { value: DataTransform.PerCapita1K, displayName: 'Per Capita (per 1K people)' },
  { value: DataTransform.PerCapita1M, displayName: 'Per Capita (per 1M people)' },
  { value: DataTransform.Normalization, displayName: 'Normalized Regional Data' }
];

export default defineComponent({
  components: {
    DropdownButton,
    RadioButtonGroup
  },
  name: 'VizOptionsPane',
  props: {
    selectedSpatialAggregation: {
      type: String,
      default: AggregationOption.Mean
    },
    selectedTemporalAggregation: {
      type: String,
      default: AggregationOption.Mean
    },
    selectedTransform: {
      type: String as PropType<DataTransform>,
      default: DataTransform.None
    },
    selectedResolution: {
      type: String,
      default: TemporalResolutionOption.Month
    },
    aggregationOptions: {
      type: Array as PropType<AggregationOption[]>,
      default: []
    },
    resolutionOptions: {
      type: Array as PropType<TemporalResolutionOption[] | null>,
      default: null
    },
    selectedBaseLayer: {
      type: String,
      default: BASE_LAYER.DEFAULT
    },
    selectedDataLayer: {
      type: String,
      default: DATA_LAYER.ADMIN
    },
    selectedDataLayerTransparency: {
      type: String,
      default: DATA_LAYER_TRANSPARENCY['100%']
    },
    colorSchemeReversed: {
      type: Boolean,
      default: false
    },
    selectedColorSchemeName: {
      type: String as PropType<COLOR>,
      default: COLOR.DEFAULT
    },
    selectedColorScaleType: {
      type: String as PropType<ColorScaleType>,
      default: ColorScaleType.LinearDiscrete
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
    },
    itemId: {
      type: String,
      required: true
    }
  },
  emits: [
    'set-spatial-aggregation-selection',
    'set-temporal-aggregation-selection',
    'set-transform-selection',
    'set-resolution-selection',
    'set-base-layer-selection',
    'set-data-layer-selection',
    'set-data-layer-transparency-selection',
    'set-color-scheme-reversed',
    'set-color-scheme-name',
    'set-color-scale-type',
    'set-number-color-bins'
  ],
  setup(props, { emit }) {
    const {
      metadata,
      itemId,
      resolutionOptions,
      selectedResolution,
      selectedTransform,
      selectedDataLayer
    } = toRefs(props);

    const store = useStore();
    const route = useRoute();

    const resolutionGroupButtons = ref(Object.values(TemporalResolutionOption)
      .filter(val => val.length > 0)
      .map(val => ({ label: capitalize(val), value: val }))
    );

    const setResolutionSelection = (resolution: string) => {
      emit('set-resolution-selection', resolution);
    };

    watchEffect(() => {
      if (resolutionOptions.value !== null) {
        // requeste to restrict available temporal resolution options
        const resButtons = _.cloneDeep(resolutionGroupButtons.value);
        resolutionGroupButtons.value = resButtons.filter(btn => resolutionOptions.value?.includes(btn.value));
        // Also, set the resolution selection
        if (resolutionGroupButtons.value.findIndex(btn => btn.value === selectedResolution.value) < 0) {
          if (resolutionGroupButtons.value.length > 0) {
            setResolutionSelection(resolutionGroupButtons.value[0].value);
          }
        }
      }
    });

    const baseLayerGroupButtons = ref(Object.values(BASE_LAYER)
      .map(val => ({ label: capitalize(val), value: val })));
    const dataLayerGroupButtons = ref(Object.values(DATA_LAYER)
      .map(val => ({ label: capitalize(val), value: val })));

    const dataLayerTransparencyOptions = ref(Object.keys(DATA_LAYER_TRANSPARENCY)
      .map(key => ({ displayName: key, value: (DATA_LAYER_TRANSPARENCY as any)[key] })));

    const colorScaleGroupButtons = ref(Object.values(ColorScaleType)
      .map(val => ({ displayName: capitalize(val), value: val })));

    const colorSchemes = ref(Object.keys(COLOR_SCHEMES)
      .map(val => ({ displayName: capitalize(val.toLowerCase()), value: val })));

    const { currentOutputIndex } = useActiveDatacubeFeature(metadata, itemId);

    const modelOutputs = computed<DatacubeFeature[]>(() => {
      return metadata.value ? getOutputs(metadata.value) : [];
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

    const outputUnit = computed<string>(() => {
      return currentOutput.value.unit ?? '';
    });

    const unitOptions = computed<DropdownItem[]>(() => {
      return [{ value: outputUnit.value, displayName: outputUnit.value }, ...TRANSFORMS];
    });

    const selectedUnitOption = computed<string>(() => {
      return selectedTransform.value === DataTransform.None
        ? outputUnit.value
        : selectedTransform.value;
    });

    const isDotMapSelected = computed<boolean>(() => selectedDataLayer.value === DATA_LAYER.RAW);

    return {
      resolutionGroupButtons,
      baseLayerGroupButtons,
      dataLayerGroupButtons,
      colorScaleGroupButtons,
      modelOutputsDisplayNames,
      currentOutputDisplayName,
      colorSchemes,
      isDiscreteScale,
      isDotMapSelected,
      dataLayerTransparencyOptions,
      unitOptions,
      selectedUnitOption,
      TemporalResolutionOption,
      AggregationOption,
      setResolutionSelection,
      store,
      route
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
  data: () => ({
    showAdvancedAggregations: false
  }),
  computed: {
    maxNumberOfColorBins(): number {
      return (COLOR_SCHEMES as any)[this.selectedColorSchemeName].length;
    },
    shouldShowAdvancedAggregation(): boolean {
      return this.showAdvancedAggregations ||
        this.selectedSpatialAggregation !== this.selectedTemporalAggregation;
    }
  },
  mounted() {
    this.renderColorScale();
  },
  methods: {
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
      updateDatacubesOutputsMap(this.itemId, this.store, this.route, selectedOutputIndex);
    },
    setSpatialAggregationSelection(aggregation: string) {
      this.$emit('set-spatial-aggregation-selection', aggregation);
    },
    setTemporalAggregationSelection(aggregation: string) {
      this.$emit('set-temporal-aggregation-selection', aggregation);
    },
    setAggregationSelection(aggregation: string) {
      this.setSpatialAggregationSelection(aggregation);
      this.setTemporalAggregationSelection(aggregation);
    },
    toggleAdvancedAggregation() {
      this.showAdvancedAggregations = !this.showAdvancedAggregations;
      if (!this.showAdvancedAggregations &&
        this.selectedSpatialAggregation !== this.selectedTemporalAggregation) {
        this.setTemporalAggregationSelection(this.selectedSpatialAggregation);
      }
    },
    setTransformSelection(unit: string) {
      const transform = TRANSFORMS.map(t => t.value).includes(unit)
        ? unit as DataTransform
        : DataTransform.None;
      this.$emit('set-transform-selection', transform);
    },
    setBaseLayerSelection(baseLayer: string) {
      this.$emit('set-base-layer-selection', baseLayer);
    },
    setDataLayerSelection(dateLayer: string) {
      this.$emit('set-data-layer-selection', dateLayer);
    },
    setTransparencySelection(transparency: string) {
      this.$emit('set-data-layer-transparency-selection', transparency);
    },
    setColorScaleTypeSelection(colorScale: ColorScaleType) {
      this.$emit('set-color-scale-type', colorScale);
    },
    setColorSchemeSelection(colorScheme: string) {
      this.$emit('set-color-scheme-name', colorScheme);
    },
    renderColorScale() {
      const colors = isDiscreteScale(this.selectedColorScaleType)
        ? this.selectedColorScheme
        : d3.quantize(d3.interpolateRgbBasis(this.selectedColorScheme), COLOR_PALETTE_SIZE);
      const n = colors.length;
      const refSelection = d3.select((this.$refs as any).colorPalette);
      refSelection.selectAll('*').remove();
      refSelection
        .attr('viewBox', '0 0 ' + n + ' 1')
        .attr('preserveAspectRatio', 'none')
        .style('display', 'block')
        .style('width', COLOR_PALETTE_SIZE + 'px')
        .style('height', '25px');
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

.invalid-option {
  color: red !important;
}

.breakdown-pane-container {
  margin-bottom: 40px;
}

.dropdown-button {
  width: max-content;
}

.add-second-variable {
  color: blue;
  cursor: pointer;
}

.config-group {
  display: flex;
  flex-direction: column;

  &:not(:first-child) {
    margin-top: 3rem;
  }
}

.config-sub-group {
  display: flex;
  flex-direction: column;
  margin-top: 20px;

  > *:not(:first-child) {
    margin-top: 5px;
  }
}

.aggregation-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.label-header {
  font-weight: 600;
  font-size: $font-size-large;
  margin-bottom: 0;
}

.header-secondary {
  @include header-secondary;
  margin: 0;
}

.temporal-res-note {
  color: #d55e00
}

</style>
