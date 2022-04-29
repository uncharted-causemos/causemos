<template>
  <analysis-options-button-widget
    :initial-name="cagNameToDisplay"
    :id-to-duplicate="currentCAG"
    @rename="onRenameAnalysis"
    @duplicate="onDuplicate"
    @delete="onDeleteAnalysis"
  />
</template>

<script lang="ts">
import { computed, defineComponent, ref, toRefs } from 'vue';
import { useStore } from 'vuex';
import useToaster from '@/services/composables/useToaster';
import { CAG } from '@/utils/messages-util';
import router from '@/router';
import { ProjectType } from '@/types/Enums';
import AnalysisOptionsButtonWidget from '../widgets/analysis-options-button-widget.vue';
import _ from 'lodash';
import modelService from '@/services/model-service';

export default defineComponent({
  components: { AnalysisOptionsButtonWidget },
  name: 'AnalysisOptionsButton',
  props: {
    modelSummary: {
      type: Object,
      default: null
    },
    viewAfterDeletion: {
      type: String,
      default: 'overview'
    }
  },
  setup(props) {
    const { modelSummary, viewAfterDeletion } = toRefs(props);
    const toast = useToaster();
    const store = useStore();
    const currentCAG = computed(() => store.getters['app/currentCAG']);
    const project = computed(() => store.getters['app/project']);
    const setAnalysisName = (newName: string) => {
      store.dispatch('app/setAnalysisName', newName);
    };

    const newCagName = ref<string | null>(null);

    const cagNameToDisplay = computed(
      () => newCagName.value ?? _.get(modelSummary.value, 'name')
    );
    const onRenameAnalysis = async (newName: string) => {
      // Optimistically set new name
      newCagName.value = newName;
      // const targetCagId = this.duplicateCagId ?? currentCAG.value;
      const targetCagId = currentCAG.value;
      modelService
        .updateModelMetadata(targetCagId, { name: newCagName.value })
        .then(() => {
          setAnalysisName(newName);
        })
        .catch(() => {
          newCagName.value = '';
          toast(CAG.ERRONEOUS_RENAME, 'error', true);
        });
    };
    const onDeleteAnalysis = async () => {
      modelService
        .removeModel(currentCAG.value)
        .then(() => {
          toast(CAG.SUCCESSFUL_DELETION, 'success', false);
          // Back to splash page
          router.push({
            name: viewAfterDeletion.value,
            params: {
              project: project.value,
              projectType: ProjectType.Analysis
            }
          });
        })
        .catch(() => {
          toast(CAG.ERRONEOUS_DELETION, 'error', true);
        });
    };
    const onDuplicate = (name: string) => {
      modelService.duplicateModel(currentCAG.value, name).then((result) => {
        toast(CAG.SUCCESSFUL_DUPLICATE, 'success', false);
        router.push({
          name: 'qualitative',
          params: {
            project: project.value,
            currentCAG: result.id,
            projectType: ProjectType.Analysis
          }
        });
      }).catch(() => {
        toast(CAG.ERRONEOUS_DUPLICATE, 'error', false);
      });
    };

    return {
      cagNameToDisplay,
      onRenameAnalysis,
      onDuplicate,
      onDeleteAnalysis,
      currentCAG
    };
  }
});
</script>
