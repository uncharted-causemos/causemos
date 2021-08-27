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
      <div class="row form-group">
        <label class="col-md-3 col-form-label">Theme</label>
        <div class="col-md-7">
          <input class="form-control" v-model="theme" type="text" placeholder="Type a theme"/>
        </div>
      </div>
      <div class="row form-group">
        <label class="col-md-3 col-form-label">Theme property</label>
        <div class="col-md-7">
          <input class="form-control" v-model="theme_property" type="text" placeholder="Type the theme property (optional)"/>
        </div>
      </div>
      <div class="row form-group">
        <label class="col-md-3 col-form-label">Process</label>
        <div class="col-md-7">
          <input class="form-control" v-model="process" type="text" placeholder="Type a process (optional)"/>
        </div>
      </div>
      <div class="row form-group">
        <label class="col-md-3 col-form-label">Process property</label>
        <div class="col-md-7">
          <input class="form-control" v-model="process_property" type="text" placeholder="Type the process property (optional)"/>
        </div>
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
import { mapGetters, mapActions } from 'vuex';
import Modal from '@/components/modals/modal';
import projectService from '@/services/project-service';

export default {
  name: 'modal-custom-concept',
  components: {
    Modal
  },
  methods: {
    ...mapActions({
      updateOntologyCache: 'app/updateOntologyCache'
    }),
    saveCustomConcept() {
      const concept = this.customGrounding.theme;
      // Update ontology
      if (this.ontologySet.has(concept) === false) {
        projectService.addNewConceptToOntology(this.project, concept, [], '');
        this.updateOntologyCache(concept);
      } else {
        console.error(`Trying to add existing concept ${concept}, ignoring...`);
      }

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
    ...mapGetters({
      project: 'app/project',
      ontologySet: 'app/ontologySet'
    }),
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
</style>
