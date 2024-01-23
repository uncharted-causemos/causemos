import { BreakdownState, Indicator, Model, ModelOrDatasetState } from '@/types/Datacube';
import {
  AggregationOption,
  DatacubeGeoAttributeVariableType,
  SpatialAggregation,
  TemporalResolutionOption,
} from '@/types/Enums';
import _ from 'lodash';
import { Ref, computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import useInsightStore from './useInsightStore';
import { getInsightById } from '@/services/insight-service';
import { ModelOrDatasetStateInsight } from '@/types/Insight';
import { getAnalysisItemState, updateAnalysisItemState } from '@/services/analysis-service';

const SAVE_ANALYSIS_ITEM_STATE_DEBOUNCE_DELAY = 500;
// Wrap `updateAnalysisItemState` with debounce function to allow only the last update call to be made when multiple calls are being called within short period of time.
const _saveAnalysisItemState = _.debounce(
  (analysisId: string, analysisItemId: string, state: ModelOrDatasetState) => {
    if (analysisId && analysisItemId) updateAnalysisItemState(analysisId, analysisItemId, state);
  },
  SAVE_ANALYSIS_ITEM_STATE_DEBOUNCE_DELAY
);

/**
 * Loads the initial state for a given model or dataset, and updates it if an insight is applied.
 * Initial state can come from three places, in order of priority:
 *  - an insight that the user is trying to apply
 *  - the saved state of the model or dataset within a data analysis (list of datacubes)
 *  - the default state of the model or dataset, saved when the model or dataset is first ingested
 *    into the system by the pipeline
 * @param metadata The metadata of a datacube as fetched from the `datacube` ElasticSearch index
 * @returns The ModelOrDatasetState ref as long as computed properties and setters for its fields.
 */
export default function useModelOrDatasetDrilldownState(metadata: Ref<Model | Indicator | null>) {
  const state = ref<ModelOrDatasetState | null>(null);

  const route = useRoute();
  const router = useRouter();

  const { setModelOrDatasetState } = useInsightStore();
  const setState = (newState: ModelOrDatasetState) => {
    state.value = newState;
    // Save to insight store
    setModelOrDatasetState(newState);
    // Save analysis item state to the backend
    _saveAnalysisItemState(
      (route.query.analysis_id as string) ?? '',
      (route.query.analysis_item_id as string) ?? '',
      newState
    );
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

  // Any time an insight is applied (either on first page load or after applying an insight from this
  //  page), immediately update the state and remove it from the URL
  watch(
    () => route.query.insight_id,
    async (insightId) => {
      if (typeof insightId === 'string') {
        const insight = (await getInsightById(insightId)) as ModelOrDatasetStateInsight;
        setState(insight.state);
        // Remove insightId from the route once state is applied
        router.replace({
          query: {
            ...route.query,
            insight_id: undefined,
          },
        });
      }
    },
    { immediate: true }
  );

  // Any time the analysisId or analysisItem changes, update the state as long as there is no insight
  //  that should be applied instead.
  watch(
    [
      () => route.query.insight_id,
      () => route.query.analysis_id,
      () => route.query.analysis_item_id,
    ],
    async (
      [insightId, analysisId, analysisItemId],
      [, previousAnalysisId, previousAnalysisItemId]
    ) => {
      if (insightId !== undefined) {
        return;
      }
      if (analysisId !== previousAnalysisId || analysisItemId !== previousAnalysisItemId) {
        const newState = await getAnalysisItemState(analysisId as string, analysisItemId as string);
        setState(newState);
      }
    },
    { immediate: true }
  );

  // Initialize default state for this model or dataset, unless state should be applied from an
  //  insight or an analysis item.
  watch(
    [() => route.query.insight_id, () => route.query.analysisId, metadata],
    async ([insightId, analysisId, _metadata]) => {
      if (insightId !== undefined || analysisId !== undefined) return;
      // If breakdown state is not null, it's already been initialized, so return.
      if (breakdownState.value !== null) return;
      // When enough metadata has been fetched, initialize the breakdown state
      if (_metadata === null) return;
      const defaultState = _metadata.default_state;
      if (defaultState === undefined) return;
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
