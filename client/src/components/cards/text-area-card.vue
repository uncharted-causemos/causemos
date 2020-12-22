<template>
  <card
    class="text-area-card-container"
    :is-hoverable="false"
  >
    <h4>
      {{ title + (hasUnsavedText ? '*' : '') }}
      <close-button
        @click="close()"
      />
    </h4>
    <textarea
      v-model="enteredText"
      rows="10"
      class="form-control"
      @focusout="lostFocus"
    />
  </card>
</template>

<script>
import _ from 'lodash';
import Card from '@/components/widgets/card';
import CloseButton from '@/components/widgets/close-button';

export default {
  name: 'TextAreaCard',
  components: {
    Card,
    CloseButton
  },
  props: {
    title: {
      type: String,
      default: '[Card Title]'
    },
    initialText: {
      type: String,
      default: ''
    }
  },
  data: () => ({
    enteredText: null,
    hasUnsavedText: false
  }),
  watch: {
    enteredText(newText, oldText) {
      if (oldText !== null) {
        this.hasUnsavedText = true;
        this.scheduleTextSave();
      }
    }
  },
  mounted() {
    this.enteredText = this.initialText;
  },
  methods: {
    scheduleTextSave: _.throttle(function() { this.saveText(); }, 3000, { trailing: true, leading: false }),
    saveText() {
      if (this.hasUnsavedText) {
        this.hasUnsavedText = false;
        this.$emit('saveText', this.enteredText);
      }
    },
    lostFocus() {
      this.saveText();
    },
    close() {
      this.saveText();
      this.$emit('close');
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/_variables.scss";
.text-area-card-container {
  width: 25%;
  z-index: map-get($z-index-order, modal);
}

.close-button {

  &:hover {
    color: #E0E0E0;
  }

  top: 8px;
  right: 8px;
}

h4 {
  background: #15223D;
  color: #FFF;
  padding: 10px 14px;
  margin: 0;
  border-top-left-radius: inherit;
  border-top-right-radius: inherit;
  transition: background 0.15s;
}

.form-control {
  background: #ffffff;
  resize: none;
  font-size: medium;
  border-radius: 0;
  border-bottom-left-radius: inherit;
  border-bottom-right-radius: inherit;
}

</style>
