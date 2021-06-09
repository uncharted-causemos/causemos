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

<script lang="ts">
import _ from 'lodash';
import { defineComponent } from 'vue';
import Card from '@/components/widgets/card.vue';
import CloseButton from '@/components/widgets/close-button.vue';

export default defineComponent({
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
  emits: [
    'saveText', 'close'
  ],
  data: () => ({
    enteredText: '',
    hasUnsavedText: false
  }),
  watch: {
    enteredText(newText, oldText) {
      if (newText && oldText !== '') {
        this.hasUnsavedText = true;
        this.scheduleTextSave();
      }
    }
  },
  mounted() {
    this.enteredText = this.initialText;
  },
  methods: {
    scheduleTextSave() {
      const saveText = this.saveText;
      return _.debounce(function() { saveText(); }, 3000)();
    },
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
});
</script>

<style lang="scss" scoped>
@import "~styles/variables.scss";
.text-area-card-container {
  width: 25%;
  z-index: 9998;
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
