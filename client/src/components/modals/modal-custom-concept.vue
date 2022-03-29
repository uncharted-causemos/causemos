<template>
  <modal
    :show-close-button="true"
    @close="close()"
  >
    <template #header>
      <h5>Add custom concept</h5>
    </template>
    <template #body>
      <div> What is the concept you could not find in the ontology? </div>
      <input class="form-control" v-model="theme" type="text" placeholder="e.g. heavy rainfall"/>
      <!--
      <div class="row form-group">
        <label class="col-md-3 col-form-label">Theme</label>
        <div class="col-md-7">
          <input class="form-control" v-model="theme" type="text" placeholder="Type a theme"/>
          <div class="input-error-message" v-if="errorMessages.theme">{{errorMessages.theme}}</div>
        </div>
      </div>
      <div class="row form-group">
        <label class="col-md-3 col-form-label">Theme property</label>
        <div class="col-md-7">
          <input class="form-control" v-model="theme_property" type="text" placeholder="Type the theme property (optional)"/>
          <div class="input-error-message" v-if="errorMessages.theme_property">{{errorMessages.theme_property}}</div>
        </div>
      </div>
      <div class="row form-group">
        <label class="col-md-3 col-form-label">Process</label>
        <div class="col-md-7">
          <input class="form-control" v-model="process" type="text" placeholder="Type a process (optional)"/>
          <div class="input-error-message" v-if="errorMessages.process">{{errorMessages.process}}</div>
        </div>
      </div>
      <div class="row form-group">
        <label class="col-md-3 col-form-label">Process property</label>
        <div class="col-md-7">
          <input class="form-control" v-model="process_property" type="text" placeholder="Type the process property (optional)"/>
          <div class="input-error-message" v-if="errorMessages.process_property">{{errorMessages.process_property}}</div>
        </div>
      </div>
      -->
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
          :disabled="!isValid"
          @click.stop="saveCustomConcept">Save Concept
        </button>
      </ul>
    </template>
  </modal>
</template>

<script lang="ts">
import { defineComponent, ref, Ref } from 'vue';
import { mapGetters, mapActions } from 'vuex';
import Modal from '@/components/modals/modal.vue';
import projectService from '@/services/project-service';

// this error message can probably be worded better
const ALPHANUMERIC_ERROR = 'This field can only contain alphanumeric characters';

export default defineComponent({
  name: 'modal-custom-concept',
  components: {
    Modal
  },
  setup() {
    return {
      theme: ref(''),
      theme_property: ref(''),
      process: ref(''),
      process_property: ref(''),
      errorMessages: ref({ theme: 'This field is required', theme_property: '', process: '', process_property: '' }) as Ref<{ [key: string]: string }>
    };
  },
  watch: {
    theme(value) {
      if (value.length > 0) {
        if (this.isAlphaNumeric(value)) {
          this.errorMessages.theme = '';
        } else {
          this.errorMessages.theme = ALPHANUMERIC_ERROR;
        }
      } else {
        this.errorMessages.theme = 'This field is required';
      }
    },
    theme_property(value) {
      if (value === '' || this.isAlphaNumeric(value)) {
        this.errorMessages.theme_property = '';
      } else {
        this.errorMessages.theme_property = ALPHANUMERIC_ERROR;
      }
    },
    process(value) {
      if (value === '' || this.isAlphaNumeric(value)) {
        this.errorMessages.process = '';
      } else {
        this.errorMessages.process = ALPHANUMERIC_ERROR;
      }
    },
    process_property(value) {
      if (value === '' || this.isAlphaNumeric(value)) {
        this.errorMessages.process_property = '';
      } else {
        this.errorMessages.process_property = ALPHANUMERIC_ERROR;
      }
    }
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
    isAlphaNumeric(str: string) {
      const regex = RegExp('^[A-Za-z0-9 ]+$');
      return regex.test(str);
    },
    close() {
      this.$emit('close', null);
    }
  },
  computed: {
    ...mapGetters({
      project: 'app/project',
      ontologySet: 'app/ontologySet'
    }),
    isValid() {
      if (this.errorMessages.theme || this.errorMessages.theme_property || this.errorMessages.process || this.errorMessages.process_property) {
        return false;
      }
      return true;
    },
    customGrounding(): { [key: string]: string } {
      return {
        theme: this.theme.trim(),
        theme_property: this.theme_property.trim(),
        process: this.process.trim(),
        process_property: this.process_property.trim()
      };
    }
  },
  emits: [
    'close',
    'saveCustomConcept'
  ]
});
</script>

<style lang="scss" scoped>
.input-error-message {
  text-align: left;
  color: red;
}

input::placeholder {
  color: #888;
}
</style>
