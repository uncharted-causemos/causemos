<template>
  <nav class="action-bar-container">
    <ul class="unstyled-list">
      <!-- Actions -->
      <li class="nav-item">
        <button
          v-tooltip.top-center="'Add a new concept'"
          type="button"
          class="btn"
          @click="addConcept"
        >
          <i class="fa fa-fw fa-plus" />Add Concept
        </button>
      </li>
      <li class="nav-item">
        <button
          v-tooltip.top-center="'Import existing CAG'"
          type="button"
          class="btn"
          @click="importCAG"
        >
          <i class="fa fa-fw fa-connectdevelop" />Import CAG
        </button>
      </li>
      <li class="nav-item">
        <button
          v-tooltip.top-center="'reset CAG positioning'"
          type="button"
          class="btn"
          @click="resetCAG"
        >
          <i class="fa fa-fw fa-undo" />Reset Layout
        </button>
      </li>
    </ul>

    <div class="run-model">
      <arrow-button
        :disabled="isRunningModel || numEdges === 0"
        :text="'Analyze Scenarios'"
        :isPointingLeft="false"
        :icon="'fa-connectdevelop'"
        @click="onRunModel"
      />
    </div>
  </nav>
</template>

<script lang="ts">
import _ from 'lodash';
import { defineComponent, PropType, ref } from 'vue';
import { mapActions, mapGetters } from 'vuex';

import useToaster from '@/services/composables/useToaster';
import modelService from '@/services/model-service';
import { CAG } from '@/utils/messages-util';
import ArrowButton from '@/components/widgets/arrow-button.vue';
import { ProjectType, TemporalResolutionOption, TimeScale } from '@/types/Enums';
import { CAGModelSummary } from '@/types/CAG';
import { TYPE } from 'vue-toastification';

export default defineComponent({
  name: 'ActionBar',
  components: {
    ArrowButton,
  },
  props: {
    modelSummary: {
      type: Object as PropType<CAGModelSummary | null>,
      default: null,
    },
    modelComponents: {
      type: Object,
      required: true,
    },
  },
  emits: ['add-concept', 'import-cag', 'reset-cag'],
  setup() {
    return {
      isRunningModel: ref(false),
      toaster: useToaster(),
    };
  },
  computed: {
    ...mapGetters({
      project: 'app/project',
      currentCAG: 'app/currentCAG',
    }),
    numEdges(): number {
      return _.get(this.modelComponents, 'edges', []).length;
    },
  },
  methods: {
    ...mapActions({
      enableOverlay: 'app/enableOverlay',
      disableOverlay: 'app/disableOverlay',
      setAnalysisName: 'app/setAnalysisName',
    }),
    addConcept() {
      this.$emit('add-concept');
    },
    importCAG() {
      this.$emit('import-cag');
    },
    resetCAG() {
      this.$emit('reset-cag');
    },
    async onRunModel() {
      this.isRunningModel = true;
      this.enableOverlay('Preparing & Initializing CAG nodes');
      // Quantify the model on the back end
      try {
        const timeScale = this.modelSummary?.parameter.time_scale ?? TimeScale.Months;
        let temporalResolution = TemporalResolutionOption.Month;
        // convert time-scale value to TemporalResolutionOption
        if (timeScale === TimeScale.Months) {
          temporalResolution = TemporalResolutionOption.Month;
        }
        if (timeScale === TimeScale.Years) {
          temporalResolution = TemporalResolutionOption.Year;
        }
        await modelService.quantifyModelNodes(this.currentCAG, temporalResolution);
        // Navigate to the Quantitative View
        this.$router.push({
          name: 'quantitative',
          params: {
            project: this.project,
            currentCAG: this.currentCAG,
            projectType: ProjectType.Analysis,
          },
        });
      } catch {
        this.toaster(CAG.ERRONEOUS_MODEL_RUN, TYPE.INFO, true);
        return;
      } finally {
        this.isRunningModel = false;
        this.disableOverlay();
      }
    },
  },
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.action-bar-container {
  height: $navbar-outer-height;
  display: flex;
  align-items: center;

  // Add an empty pseudo element at the left side of the bar to center the
  //  action buttons
  &::before {
    display: block;
    content: '';
    flex: 1;
    min-width: 0;
  }
  .run-model {
    margin-right: 10px;
    display: flex;
    flex: 1;
    min-width: 0;
    justify-content: flex-end;
    box-sizing: border-box;
  }
  .nav-item {
    margin-left: 5px;
  }
  button {
    i {
      margin-right: 5px;
    }
  }
}
</style>
