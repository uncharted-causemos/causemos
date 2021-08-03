import { DatacubeFeature, Indicator, Model } from '@/types/Datacube';
import { Ref, ref, watchEffect } from 'vue';
import { getDatacubeById } from '@/services/new-datacube-service';
import { getValidatedOutputs } from '@/utils/datacube-util';
import { DatacubeType } from '@/types/Enums';

/**
 * Takes an id then fetches and returns the metadata associated
 * with that model/indicator.
 */
export default function useModelMetadata(id: Ref<string | null>): Ref<Model | Indicator | null> {
  const metadata = ref<Model | Indicator | null>(null);

  watchEffect(onInvalidate => {
    metadata.value = null;
    let isCancelled = false;
    async function fetchMetadata() {
      if (id.value === null || id.value === '') return;
      const rawMetadata: Model | Indicator = await getDatacubeById(id.value);
      if (isCancelled) {
        // Dependencies have changed since the fetch started, so ignore the
        //  fetch results to avoid a race condition.
        return;
      }
      // filter outputs and remove invalid/unsupported ones
      //  For now, saved the validated output in a new attribute.
      // @Review: Later, we could just replace the 'outputs' attribute with the validated list
      rawMetadata.outputs.forEach(output => {
        if (output.is_visible === undefined) {
          output.is_visible = true;
        }
      });
      rawMetadata.validatedOutputs = getValidatedOutputs(rawMetadata.outputs);

      // for every loaded datacube, we may enable extended annotation of qualifiers
      // so ensure that the "*.roles" exist as a valid attribute
      if (rawMetadata.qualifier_outputs) {
        rawMetadata.qualifier_outputs.forEach(qualifier => {
          if (!qualifier.roles) {
            qualifier.roles = [];
          }
        });
      }

      // add initial visibility if not defined
      rawMetadata.outputs.forEach(output => {
        if (output.is_visible === undefined) {
          output.is_visible = rawMetadata.validatedOutputs?.find((o: DatacubeFeature) => o.name === output.name) !== undefined;
        }
      });
      if (rawMetadata.type === DatacubeType.Model) {
        const modelMetadata = rawMetadata as Model;
        modelMetadata.parameters.forEach(param => {
          if (param.is_visible === undefined) {
            param.is_visible = true;
          }
        });
      }
      if (rawMetadata.qualifier_outputs) {
        rawMetadata.qualifier_outputs.forEach(qualifier => {
          if (qualifier.is_visible === undefined) {
            qualifier.is_visible = false;
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
