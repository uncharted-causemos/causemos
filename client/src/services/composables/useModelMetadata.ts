import { DatacubeFeature, Indicator, Model } from '@/types/Datacube';
import { Ref, ref, watchEffect } from 'vue';
import { getDatacubeById } from '@/services/new-datacube-service';
import { getValidatedOutputs, isModel } from '@/utils/datacube-util';
import { ModelParameterDataType } from '@/types/Enums';
import _ from 'lodash';

/**
 * Takes an id then fetches and returns the metadata associated
 * with that model/indicator.
 */
export default function useModelMetadata(id: Ref<string | null>): Ref<Model | Indicator | null> {
  const metadata = ref<Model | Indicator | null>(null);

  watchEffect((onInvalidate) => {
    metadata.value = null;
    let isCancelled = false;
    async function fetchMetadata() {
      if (id.value === null || id.value === undefined || id.value === '') return;
      const rawMetadata: Model | Indicator = await getDatacubeById(id.value);
      if (isCancelled) {
        // Dependencies have changed since the fetch started, so ignore the
        //  fetch results to avoid a race condition.
        return;
      }

      if (!rawMetadata) {
        return;
      }

      // filter outputs and remove invalid/unsupported ones
      //  For now, saved the validated output in a new attribute.
      // @Review: Later, we could just replace the 'outputs' attribute with the validated list
      rawMetadata.validatedOutputs = getValidatedOutputs(rawMetadata.outputs);

      // add initial visibility if not defined
      rawMetadata.outputs.forEach((output) => {
        if (output.is_visible === undefined) {
          output.is_visible =
            rawMetadata.validatedOutputs?.find((o: DatacubeFeature) => o.name === output.name) !==
            undefined;
        }
      });
      if (isModel(rawMetadata)) {
        const modelMetadata = rawMetadata;
        modelMetadata.parameters.forEach((param) => {
          if (param.is_visible === undefined) {
            param.is_visible = true;
          }
        });
      }
      if (rawMetadata.qualifier_outputs) {
        rawMetadata.qualifier_outputs.forEach((qualifier) => {
          if (qualifier.is_visible === undefined) {
            qualifier.is_visible = true;
          }
        });
      }

      // add initial labels for params with a valid list of choices
      if (isModel(rawMetadata)) {
        const modelMetadata = rawMetadata;
        modelMetadata.parameters.forEach((param) => {
          // ignore qualifiers (i.e., drilldown params)
          // ignore freeform params
          // only applicable to tweakable input params with a valid list of choices
          if (
            param.data_type !== ModelParameterDataType.Freeform &&
            param.choices !== null &&
            param.choices !== undefined &&
            param.choices.length > 0 &&
            (param.is_drilldown === null || param.is_drilldown === false)
          ) {
            if (param.choices_labels === undefined) {
              param.choices_labels = _.cloneDeep(param.choices);
            }
          }
        });
      }

      metadata.value = rawMetadata;
    }
    onInvalidate(() => {
      isCancelled = true;
    });
    fetchMetadata();
  });

  return metadata;
}
