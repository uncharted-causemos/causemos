<template>
  <side-panel
    class="analysis-side-panel-container"
    :current-tab-name="activeSidePanelTab"
    :tabs="sidePanelTabs"
    :add-padding="true"
    :is-large="true"
    @set-active="setActiveSidePanelTab"
  >
    <p>If you can't find the data you need but know how to generate it using available data cubes, you can
      <strong>specify your own data cube</strong>.
    </p>
    <p>The <strong>steps</strong> are as follows:</p>
    <ol>
      <li>Select the <strong>transform</strong> needed to produce your custom data cube.
        <button
          class="btn"
          @click="toggleIsOperationDropdownOpen"
        >
          <i
            class="fa fa-fw"
            :class="`fa-${algebraicTransform !== null ? algebraicTransform.icon : 'calculator'}`"
          />
          {{ capitalLettersFormatter(algebraicTransform !== null ? algebraicTransform.name : 'Select Transform') }}
          <i class="fa fa-fw fa-angle-down" />
          <dropdown-control
            v-if="isOperationDropdownOpen"
            class="analysis-operations-dropdown"
          >
            <div slot="content">
              <div
                v-for="option of transformOptions"
                :key="option.name"
                class="dropdown-option"
                @click="setAlgebraicTransform(option)"
              >
                <i
                  class="fa fa-fw"
                  :class="`fa-${option.icon}`"
                />
                {{ option.name | capitalLetters-formatter }}
              </div>
            </div>
          </dropdown-control>
        </button>
      </li>
      <li>Select the data cubes to use as <strong>input</strong>.
        If not already in the Analysis, use the <strong>Search</strong> button to retrieve the cube.
        <algebraic-expression
          class="algebraic-expression"
          :disabled="!isSelectModeActive"
        />
      </li>
      <li><strong>Preview</strong> your custom data cube, add metadata,
        and send the <strong>request</strong> to SuperMaaS.
        <div class="btn-group">
          <button
            class="btn"
            @click="setActiveSidePanelTab('')"
          >
            Cancel
          </button>
          <button
            class="btn btn-primary btn-call-for-action"
            :disabled="!isReadyToPreview"
            @click="openCustomCubeModal"
          >
            <i class="fa fa-fw fa-cube" />
            Preview Custom Cube
          </button>
        </div>
      </li>
    </ol>
  </side-panel>
</template>

<script>
import { mapActions, mapGetters } from 'vuex';
import SidePanel from '@/components/side-panel/side-panel';
import DropdownControl from '@/components/dropdown-control';
import AlgebraicExpression from '@/components/data/algebraic-expression';
import { SUPPORTED_TRANSFORMS } from '@/utils/data/algebraic-transform-util';
import capitalLettersFormatter from '@/formatters/capitalLetters-formatter';

export default {
  name: 'AnalysisSidePanel',
  components: {
    SidePanel,
    DropdownControl,
    AlgebraicExpression
  },
  data: () => ({
    sidePanelTabs: [
      { name: 'New Custom Data Cube', icon: 'fa fa-cube' }
    ],
    activeSidePanelTab: '',
    isOperationDropdownOpen: false,
    transformOptions: SUPPORTED_TRANSFORMS
  }),
  computed: {
    ...mapGetters({
      algebraicTransform: 'dataAnalysis/algebraicTransform',
      algebraicTransformInputIds: 'dataAnalysis/algebraicTransformInputIds'
    }),
    isSelectModeActive() {
      return this.algebraicTransform !== null;
    },
    isReadyToPreview() {
      // FIXME: We'll need to make this more dynamic if we support transforms that require
      //  3+ inputs.
      return this.isSelectModeActive && this.algebraicTransformInputIds.length >= 2;
    }
  },
  mounted() {
    if (this.isSelectModeActive) {
      // Open the side panel to the custom data cube tab if a transform has already been selected
      //  on page load. This occurs when the user navigates back from the custom cube preview page.
      this.activeSidePanelTab = 'New Custom Data Cube';
    }
  },
  methods: {
    ...mapActions({
      setAlgebraicTransform: 'dataAnalysis/setAlgebraicTransform'
    }),
    capitalLettersFormatter,
    setActiveSidePanelTab(tab) {
      this.activeSidePanelTab = tab;
      if (tab === '') {
        // We're closing the side panel, so deactivate select mode
        this.setAlgebraicTransform(null);
        this.isOperationDropdownOpen = false;
      }
    },
    toggleIsOperationDropdownOpen() {
      this.isOperationDropdownOpen = !this.isOperationDropdownOpen;
    },
    openCustomCubeModal() {
      this.$router.push({ name: 'createDataCube' });
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";

  .analysis-side-panel-container {
    margin-top: 10px;
    margin-right: 0;
    height: auto;
  }

  ol {
    margin: 0;
    margin-top: 20px;
    padding: 0;

    li {
      margin: 0;
      margin-bottom: 40px;
      list-style-position: inside;
    }

    button, .btn-group {
      display: block;
      margin: 10px auto;
      position: relative;
    }

    .algebraic-expression {
      margin-top: 10px;
    }

    .btn-group {
      width: 100%;
      display: flex;
      justify-content: space-around;

      button {
        margin: 0;
      }
    }
  }

  .analysis-operations-dropdown {
    position: absolute;
    font-weight: normal;
    text-align: left;
    top: 100%;
    left: 0;
    margin-top: 10px;
  }

</style>
