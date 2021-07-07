<template>
  <modal
    :use-green-header="false"
    :show-close-button="true"
    @close="close()"
  >
    <template #header>
      <h5>Add custom concept</h5>
    </template>
    <template #body>
      <div class="row input-row">
        <label class="col-md-4">Theme</label>
        <input class="col-md-6" v-model="theme" type="text" placeholder="Type a theme"/>
      </div>
      <div class="row input-row">
        <label class="col-md-4">Theme property</label>
        <input class="col-md-6" v-model="theme_property" type="text" placeholder="Type the theme property (optional)"/>
      </div>
      <div class="row input-row">
        <label class="col-md-4">Process</label>
        <input class="col-md-6" v-model="process" type="text" placeholder="Type a process (optional)"/>
      </div>
      <div class="row input-row">
        <label class="col-md-4">Process property</label>
        <input class="col-md-6" v-model="process_property" type="text" placeholder="Type the process property (optional)"/>
      </div>
    </template>
    <template #footer>
      <ul class="unstyled-list">
        <button
          type="button"
          class="btn first-button"
          @click.stop="close()">Cancel
        </button>
        <button
          type="button"
          class="btn btn-primary btn-call-for-action"
          :disabled="!haveData"
          @click.stop="saveCustomConcept">Save Concept
        </button>
      </ul>
    </template>
  </modal>
</template>

<script>
import Modal from '@/components/modals/modal';

export default {
  name: 'modal-custom-concept',
  components: {
    Modal
  },
  methods: {
    saveCustomConcept() {
      this.$emit('saveCustomConcept', this.customGrounding);
      this.$emit('close');
    },
    clearData() {
      this.newTheme = this.newThemeProperty = this.newProcess = this.newProcessProperty = '';
    },
    close() {
      this.clearData();
      if (this.hasContext === true) {
        this.hasContext = false;
        return;
      }
      this.$emit('close', null);
    }
  },
  data: () => ({
    theme: '',
    theme_property: '',
    process: '',
    process_property: ''
  }),
  computed: {
    haveData() {
      if (this.theme.length > 0) {
        return true;
      }
      return false;
    },
    customGrounding() {
      return {
        theme: this.theme,
        theme_property: this.theme_property,
        process: this.process,
        process_property: this.process_property
      };
    }
  },
  emits: [
    'close',
    'saveCustomConcept'
  ]
};
</script>

<style lang="scss" scoped>
.input-row {
  margin: 10px;
  padding: 5px;
}
</style>
