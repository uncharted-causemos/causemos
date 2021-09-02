<template>
  <div class="new-insight-modal-container">
    <full-screen-modal-header>
      <h5>{{title}}</h5>
    </full-screen-modal-header>
    <div class="pane-wrapper">
      <div class="pane-row">
        <div class="fields">
          <div class="preview" v-if="imagePreview !== null">
            <img :src="imagePreview">
          </div>
          <disclaimer
            v-else
            style="text-align: center; color: black"
            :message="'No image preview!'"
          />
          <div class="form-group">
            <form>
              <label> Name* </label>
              <input
                :value="name"
                v-focus
                type="text"
                class="form-control"
                placeholder="Untitled insight"
                @keyup.enter.stop="saveInsight"
                @input="updateName"
              >
              <div
                v-if="hasError === true"
                class="error-msg">
                {{ errorMsg }}
              </div>
              <label>Description</label>
              <textarea
                :value="description"
                rows="2"
                class="form-control"
                @input="updateDescription" />
            </form>
          </div>
          <div class="controls">
            <button
              type="button"
              class="btn btn-light"
              @click="cancel"
            >
              Cancel
            </button>
            <button
              v-if="isNewInsight"
              class="btn btn-primary"
              @click="autofill"
            >
              Autofill
            </button>
            <button
              type="button"
              class="btn btn-primary"
              :class="{ 'disabled': name.length === 0}"
              @click="save"
            >
              Save
            </button>
          </div>
        </div>

        <drilldown-panel
          class="metadata-drilldown-panel"
          is-open
          :tabs="drilldownTabs"
          :activeTabId="drilldownTabs[0].id"
          only-display-icons
        >
          <template #content>
            <div>
              <ul>
                <li
                  v-for="metadataAttr in metadataDetails"
                  :key="metadataAttr.key">
                  <b>{{metadataAttr.key}}</b> {{ metadataAttr.value }}
                </li>
              </ul>
            </div>
          </template>
        </drilldown-panel>

      </div>
    </div>
  </div>
</template>

<script>

import Disclaimer from '@/components/widgets/disclaimer';
import DrilldownPanel from '@/components/drilldown-panel';
import FullScreenModalHeader from '@/components/widgets/full-screen-modal-header';

const MSG_EMPTY_INSIGHT_NAME = 'Insight name cannot be blank';

const METDATA_DRILLDOWN_TABS = [
  {
    name: 'Metadata',
    id: 'metadata',
    icon: 'fa-info-circle'
  }
];

export default {
  name: 'NewEditModalLayout',
  components: {
    DrilldownPanel,
    FullScreenModalHeader,
    Disclaimer
  },
  props: {
    description: {
      type: String,
      default: ''
    },
    hasError: {
      type: Boolean,
      default: false
    },
    isNewInsight: {
      type: Boolean,
      default: true
    },
    metadataDetails: {
      type: Array,
      default: () => []
    },
    name: {
      type: String,
      default: ''
    },
    imagePreview: {
      type: String,
      default: null
    },
    title: {
      type: String,
      default: ''
    }
  },
  emits: ['auto-fill', 'cancel', 'save', 'update:description', 'update:name'],
  data: () => ({
    drilldownTabs: METDATA_DRILLDOWN_TABS,
    errorMsg: MSG_EMPTY_INSIGHT_NAME,
    insightMetadata: ''
  }),
  methods: {
    autofill() {
      this.$emit('auto-fill');
    },
    cancel() {
      this.$emit('cancel');
    },
    save() {
      this.$emit('save');
    },
    updateName(event) {
      this.$emit('update:name', event.target.value);
    },
    updateDescription(event) {
      this.$emit('update:description', event.target.value);
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.new-insight-modal-container {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  justify-content: center;
  align-content: stretch;
  align-items: stretch;
  height: 100vh;
  overflow: hidden;

  .pane-wrapper {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
    overflow-y: hidden;
    padding: 1em 0 0;
    .pane-row {
      flex: 1 1 auto;
      display: flex;
      flex-direction: row;
      height: 100%;
      .fields {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        padding-left: 1rem;
        padding-right: 1rem;
        height: 100%;
        .preview {
          flex: 1 1 auto;
          margin: 0 0 1rem;
          overflow: hidden;
          align-self: center;
          img {
            max-height: 100%;
            max-width: 100%;
          }
        }
        .form-group {
          flex: 0 0 auto;
          margin-bottom: 3px;
          form {
            display: flex;
            flex-direction: column;
            width: 100%;
            textarea {
              flex: 1 1 auto;
              resize: none;
              outline: none;
              box-sizing: border-box;
            }
          }
        }
        .controls {
          flex: 0 0 auto;
          display: flex;
          justify-content: flex-end;
          padding: 1rem;
          button {
            margin-left: 1rem;
          }
        }
      }
    }
  }
}

.error-msg {
  color: $negative;
}

h6 {
  @include header-secondary;
  font-size: $font-size-medium;
}

</style>

