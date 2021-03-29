<template>
  <div class="create-data-cube-container">
    <full-screen-modal-header
      :icon="'cube'"
      :nav-back-label="'Preview New Custom Data Cube'"
      @close="navigateBack"
    />
    <div
      v-if="isTileCacheEnabled"
      class="body"
    >
      <div class="main">
        <div
          class="inputs"
          :class="{ 'overflow': algebraicTransformInputIds.length > 2 }"
        >
          <div
            v-for="(inputId, index) of algebraicTransformInputIds"
            :key="inputId">
            <i
              v-if="index !== 0"
              :key="index"
              class="fa fa-fw transform-icon"
              :class="`fa-${algebraicTransform.icon}`"
            />
            <input-card
              :key="inputId"
              :analysis-item-id="inputId"
              class="input-card"
            />
          </div>
        </div>
        <div class="output">
          <output-preview-card
            class="output-preview-card"
            :name="name"
            :units="units"
          />
          <div class="btn-group">
            <button
              class="btn"
              @click="navigateBack"
            >Cancel</button>
            <!--
            FIXME: `pointer-events: all` allows the tooltip to activate
            even though the button is disabled. It should be removed when
            the button is no longer disabled.
            -->
            <button
              v-tooltip="'This feature is not currently implemented.'"
              style="pointer-events: all"
              class="btn btn-primary btn-call-for-action disabled"
              @click="requestCustomCube"
            >Request</button>
          </div>
        </div>
      </div>
      <drilldown-panel
        class="drilldown"
        :tabs="[{ name: 'Metadata', id: 'metadata' }]"
        :active-tab-id="'metadata'"
        :pane-title="'Metadata'"
        @close="setFocusedCardFullscreen(false)"
      >
        <template #content>
          <input
            v-model="name"
            class="form-control"
            type="text"
            placeholder="Custom data cube name"
          >
          <input
            v-model="units"
            class="form-control"
            type="text"
            placeholder="Units"
          >
          <textarea
            v-model="description"
            class="form-control"
            placeholder="Description"
          />
          <p class="top-margin"><strong>Provenance</strong></p>
          <algebraic-expression
            class="algebraic-expression"
            :disabled="false"
            :is-display-only="true"
          />
        </template>
      </drilldown-panel>
    </div>
  </div>
</template>

<script>
import FullScreenModalHeader from '@/components/widgets/full-screen-modal-header';
import InputCard from '@/components/data/input-card';
import AlgebraicExpression from '@/components/data/algebraic-expression';
import OutputPreviewCard from '@/components/data/output-preview-card';
import DrilldownPanel from '@/components/drilldown-panel';
import { mapGetters } from 'vuex';
import { disableConcurrentTileRequestsCaching, enableConcurrentTileRequestsCaching } from '@/utils/map-util';
export default {
  name: 'CreateDataCube',
  components: {
    FullScreenModalHeader,
    AlgebraicExpression,
    DrilldownPanel,
    InputCard,
    OutputPreviewCard
  },
  data: () => ({
    name: '',
    units: '',
    description: '',
    isTileCacheEnabled: false
  }),
  computed: {
    ...mapGetters({
      algebraicTransform: 'dataAnalysis/algebraicTransform',
      algebraicTransformInputIds: 'dataAnalysis/algebraicTransformInputIds'
    })
  },
  created() {
    enableConcurrentTileRequestsCaching().then(() => { this.isTileCacheEnabled = true; });
  },
  unmounted() {
    disableConcurrentTileRequestsCaching();
  },
  methods: {
    navigateBack() {
      this.$router.push({ name: 'data' });
    },
    requestCustomCube() {
      // TODO:
      console.log('Not yet implemented');
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";

$space-between-inputs: 25px;

.create-data-cube-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.body {
  display: flex;
  overflow: hidden;
  background: $background-light-1;
  flex: 1;
}

.main {
  flex: 1;
  display: flex;
  padding: 10px;
}

.inputs {
  width: 40%;
  height: 100%;
  display: flex;
  flex-direction: column;

  &.overflow {
    overflow-y: auto;
    padding-right: 10px;
    .input-card {
      flex: 0 0 calc(40% - #{$space-between-inputs / 2});
    }
  }
}

.output {
  width: calc(60% - 10px);
  height: 100%;
  margin-left: 10px;
  display: flex;
  flex-direction: column;

  .output-preview-card {
    flex: 1;
  }

  .btn-group {
    align-self: flex-end;
    margin-top: 10px;

    & > *:not(:first-child) {
      margin-left: 5px;
    }
  }
}

.input-card {
  width: 100%;
  height: calc(50% - #{$space-between-inputs / 2});
  overflow: hidden;
  position: relative;
}

$icon-height: 14px;
$icon-padding-value: ($space-between-inputs - $icon-height) / 2;

.transform-icon {
  height: $space-between-inputs;
  align-self: center;
  padding: $icon-padding-value 0;
}

.form-control {
  background: #fff;
  margin: 10px 0;
}

.top-margin {
  margin-top: 25px;
}

</style>
