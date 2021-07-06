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
        <input id="inputTheme" class="col-md-6" v-model="newTheme" type="text" placeholder="Type a theme"/>
      </div>
      <div class="row input-row">
        <label class="col-md-4">Theme property</label>
        <input id="inputThemeProperty" class="col-md-6" v-model="newThemeProperty" type="text" placeholder="Type the theme property (optional)"/>
      </div>
      <div class="row input-row">
        <label class="col-md-4">Process</label>
        <input id="inputProcess" class="col-md-6" v-model="newProcess" type="text" placeholder="Type a process (optional)"/>
      </div>
      <div class="row input-row">
        <label class="col-md-4">Process property</label>
        <input id="inputProcessProperty" class="col-md-6" v-model="newProcessProperty" type="text" placeholder="Type the process property (optional)"/>
      </div>
    </template>
    <template #footer>
      <SmallTextButton
         :label="'Save Concept'"
         @click="saveCustomConcept" />
    </template>
  </modal>
</template>

<script>
import Modal from '@/components/modals/modal';
import SmallTextButton from '@/components/widgets/small-text-button.vue';

export default {
  name: 'modal-custom-concept',
  components: {
    Modal,
    SmallTextButton
  },
  methods: {
    saveCustomConcept() {
      this.$emit('saveCustomConcept', this.customGrounding);
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
    'addCustomGrounding'
  ]
};
</script>

<style lang="scss" scoped>
.input-row {
  margin: 10px;
  padding: 5px;
}
</style>
