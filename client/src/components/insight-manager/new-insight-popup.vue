<template>
  <div class="new-insight-popup-container">
    <div class="pane-header">
      <h6>New Insight</h6>
      <close-button @click="closeInsightPopup()" />
    </div>
    <div class="pane-content">
      <form>
        <div class="form-group">
          <label> Title* </label>
          <input
            v-model="title"
            v-focus
            type="text"
            class="form-control"
            placeholder="Untitled insight"
            @keyup.enter.stop="saveInsight"
          >
          <div
            v-if="hasError === true"
            class="error-msg">
            {{ errorMsg }}
          </div>
          <label>Description</label>
          <textarea
            rows="10"
            v-model="description"
            class="form-control" />
        </div>
      </form>
    </div>
    <div class="controls">
      <button
        type="button"
        class="btn btn-light"
        @click="closeInsightPopup"
      >
        Cancel
      </button>
      <button
        type="button"
        class="btn btn-primary"
        :class="{ 'disabled': title.length === 0}"
        @click="saveInsight"
      >
        Save
      </button>
    </div>
  </div>
</template>

<script>
import _ from 'lodash';

import CloseButton from '@/components/widgets/close-button';

const MSG_EMPTY_BOOKMARK_TITLE = 'Insight title cannot be blank';

export default {
  name: 'NewInsightPopup',
  components: {
    CloseButton
  },
  emits: [
    'close-insight-popup'
  ],
  data: () => ({
    title: '',
    description: '',
    hasError: false,
    errorMsg: MSG_EMPTY_BOOKMARK_TITLE
  }),
  computed: {
  },
  watch: {
    title(n) {
      if (_.isEmpty(n) && this.isPanelOpen) {
        this.hasError = true;
        this.errorMsg = MSG_EMPTY_BOOKMARK_TITLE;
      } else {
        this.hasError = false;
        this.errorMsg = null;
      }
    }
  },
  methods: {
    initInsight() {
      this.title = '';
      this.description = '';
      this.hasError = false;
    },
    saveInsight() {
      console.log('insight saved!');
      this.$emit('close-insight-popup', { saved: true });
    },
    closeInsightPopup() {
      this.$emit('close-insight-popup', { saved: false });
    }
  }
};
</script>

<style lang="scss">
@import "~styles/variables";

.new-insight-popup-container {
  .controls {
    display: flex;
    justify-content: flex-end;

    button {
      margin-left: 10px;
    }
  }

  textarea {
    height: 25vh;
    width: 100%;
    box-sizing: border-box;
    resize: none;
    outline: none;
  }

  .pane-title {
    font-size: $font-size-large;
    padding: 10px 0;
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

