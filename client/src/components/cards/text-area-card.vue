<template>
  <card class="text-area-card-container" :is-hoverable="false">
    <h4>
      {{ title + (hasUnsavedText ? '*' : '') }}
      <close-button @click="close()" />
    </h4>
    <textarea v-model="enteredText" rows="10" class="form-control" @focusout="lostFocus" />
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
    CloseButton,
  },
  props: {
    title: {
      type: String,
      default: '[Card Title]',
    },
    initialText: {
      type: String,
      default: '',
    },
  },
  emits: ['saveText', 'close'],
  data: () => ({
    enteredText: '',
    hasUnsavedText: false,
  }),
  watch: {
    enteredText(newText, oldText) {
      if (oldText !== '') {
        this.hasUnsavedText = true;
        this.scheduleTextSave();
      }
    },
  },
  mounted() {
    this.enteredText = this.initialText;
  },
  methods: {
    scheduleTextSave() {
      const saveText = this.saveText;
      return _.debounce(function () {
        saveText();
      }, 3000)();
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
    },
  },
});
</script>

<style lang="scss" scoped>
@import '~styles/variables.scss';
.text-area-card-container {
  width: 25%;
  z-index: 9998;
  background: white;
  padding: 10px;
}

.close-button {
  position: relative;
  top: auto;
  right: auto;

  &:hover {
    color: #e0e0e0;
  }
}

h4 {
  @include header-secondary;
  margin: 0;
  margin-bottom: 10px;
  border-top-left-radius: inherit;
  border-top-right-radius: inherit;
  transition: background 0.15s;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-control {
  resize: none;
  font-size: medium;
  border: 1px solid $background-light-3;
  background: $background-light-1;
  border-radius: 0;
  border-bottom-left-radius: inherit;
  border-bottom-right-radius: inherit;
}
</style>
