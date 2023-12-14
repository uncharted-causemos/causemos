import { BreakdownState, Model, ModelOrDatasetState } from '@/types/Datacube';
import {
  AggregationOption,
  DatacubeGeoAttributeVariableType,
  SpatialAggregation,
  TemporalResolutionOption,
} from '@/types/Enums';
import _ from 'lodash';
import { Ref, computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

/**
 * Loads the initial state for a given model datacube, and updates it if an insight is applied.
 * Initial state can come from three places, in order of priority:
 *  - an insight that the user is trying to apply
 *  - the saved state of the model within a data analysis (list of model datacubes)
 *  - the default state of the model, saved when the model is first ingested into the system by the pipeline
 * @param metadata The metadata of a model datacube as fetched from the `datacube` ElasticSearch index
 * @returns The ModelOrDatasetState ref as long as computed properties and setters for its fields.
 */
export default function useModelState(metadata: Ref<Model | null>) {
  const state = ref<ModelOrDatasetState | null>(null);
  const setState = (newState: ModelOrDatasetState) => {
    state.value = newState;
  };
  const updateState = (partialState: Partial<ModelOrDatasetState>) => {
    if (state.value === null) return;
    setState({
      ..._.cloneDeep(state.value),
      ...partialState,
    });
  };

  const breakdownState = computed(() => state.value?.breakdownState ?? null);
  const setBreakdownState = (newBreakdownState: BreakdownState) =>
    updateState({ breakdownState: newBreakdownState });

  const spatialAggregation = computed(
    () => state.value?.spatialAggregation ?? DatacubeGeoAttributeVariableType.Country
  );
  const setSpatialAggregation = (newValue: SpatialAggregation) =>
    updateState({ spatialAggregation: newValue });

  const spatialAggregationMethod = computed(
    () => state.value?.spatialAggregationMethod ?? AggregationOption.Mean
  );
  const setSpatialAggregationMethod = (newValue: AggregationOption) => {
    updateState({ spatialAggregationMethod: newValue });
  };

  const temporalResolution = computed(
    () => state.value?.temporalResolution ?? TemporalResolutionOption.Month
  );
  const setTemporalResolution = (newValue: TemporalResolutionOption) => {
    updateState({ temporalResolution: newValue });
  };

  const temporalAggregationMethod = computed(() => spatialAggregationMethod.value);

  const selectedTimestamp = computed(() => state.value?.selectedTimestamp ?? null);
  const setSelectedTimestamp = (newValue: number | null) => {
    updateState({ selectedTimestamp: newValue });
  };

  const route = useRoute();
  // Any time an insight is applied (either on first page load or after applying an insight from this
  //  page), immediately update the state and remove it from the URL
  watch(
    () => route.query.insight_id,
    (insightId) => {
      if (insightId !== undefined) {
        // TODO: const newState = getStateFromInsight(insightId);
        // TODO: setState(newState);
        // TODO: remove insightId from the route once state is applied
      }
    },
    { immediate: true }
  );

  // Any time the analysisId or analysisItem changes, update the state as long as there is no insight
  //  that should be applied instead.
  watch(
    [() => route.query.insight_id, () => route.query.analysisId, () => route.query.item_id],
    ([insightId, analysisId, analysisItemId], [, previousAnalysisId, previousAnalysisItemId]) => {
      if (insightId !== undefined) {
        return;
      }
      if (analysisId !== previousAnalysisId || analysisItemId !== previousAnalysisItemId) {
        // TODO: const newState = getStateFromAnalysisItem(analysisId, analysisItemId);
        // TODO: setState(newState);
      }
    },
    { immediate: true }
  );

  // Initialize default state for this model, unless state should be applied from an insight or an
  //  analysis item.
  watch(
    [() => route.query.insight_id, () => route.query.analysisId, metadata],
    async ([insightId, analysisId, _metadata]) => {
      if (insightId !== undefined || analysisId !== undefined) return;
      // If breakdown state is not null, it's already been initialized, so return.
      if (breakdownState.value !== null) return;
      // When enough metadata has been fetched, initialize the breakdown state
      if (_metadata === null) return;
      // TODO: clean this up when default_state is standardized
      const defaultState = (_metadata as any).default_state;
      if (defaultState === undefined) return;
      console.log('Successfully loaded defaultState:', defaultState);
      setState(defaultState);
    },
    { immediate: true }
  );

  return {
    breakdownState,
    setBreakdownState,
    spatialAggregation,
    setSpatialAggregation,
    spatialAggregationMethod,
    setSpatialAggregationMethod,
    temporalResolution,
    setTemporalResolution,
    temporalAggregationMethod,
    selectedTimestamp,
    setSelectedTimestamp,
  };
}
