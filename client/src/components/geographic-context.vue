<script setup lang="ts">
import Button from 'primevue/button';
import { onMounted, ref } from 'vue';

const props = defineProps<{
  displayListInComponent: boolean;
  geoContextString: string;
}>();

const geoContextStringLive = ref<string>('');
onMounted(() => {
  geoContextStringLive.value = props.geoContextString.trim();
});

const editGeoContext = ref<boolean>(false);
const toggleGeoContext = () => {
  editGeoContext.value = !editGeoContext.value;
};

const emit = defineEmits<{
  (e: 'save-geo-context', value: string): void;
}>();

const clearGeoContextString = () => {
  toggleGeoContext();
  geoContextStringLive.value = '';
  emit('save-geo-context', geoContextStringLive.value);
};

const doneSettingGeoContext = () => {
  toggleGeoContext();
  emit('save-geo-context', geoContextStringLive.value);
};

const addGeoContext = () => {
  if (!props.displayListInComponent) {
    // none-zero length to let the parent component know to adjust text labels (list to be displayed in parent)
    emit('save-geo-context', ' ');
  }
  toggleGeoContext();
};
</script>

<template>
  <div class="geoContext subdued">
    <Button
      v-if="!editGeoContext && geoContextString.length === 0"
      label="Add geographic context"
      icon="fa fa-globe"
      outlined
      @click="addGeoContext"
    />
    <div class="show-geo-context" v-if="!editGeoContext && geoContextString.length > 0">
      <p v-if="displayListInComponent" class="subdued">in {{ geoContextString }}</p>
      <button class="btn btn-sm btn-default" @click="toggleGeoContext">
        Edit geographic context
      </button>
    </div>
    <div v-if="editGeoContext" class="geo-context-editor">
      <div class="geo-context-input">
        <p v-if="displayListInComponent" class="subdued">in</p>
        <input v-focus class="form-control" v-model="geoContextStringLive" />
      </div>
      <div class="geo-context-controls">
        <button class="btn btn-sm btn-default" @click="clearGeoContextString">Clear</button>
        <button class="btn btn-sm btn-primary" @click="doneSettingGeoContext">Done</button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import '@/styles/variables';
.geoContext {
  margin-bottom: 10px;

  .geo-context-input {
    display: flex;
    flex-direction: row;
    margin: 5px 0;
    p {
      margin: 0;
    }

    input {
      margin-left: 5px;
      width: 100%;
      height: 1.6em;
      background-color: white;
    }
  }
  .show-geo-context {
    display: flex;
    flex-direction: row;
    gap: 8px;
    p {
      padding: 4px 0;
      width: 100%;
      margin: 0;
    }
  }

  .geo-context-controls {
    display: flex;
    flex-direction: row;
    align-items: end;
    justify-content: end;
    column-gap: 5px;
    button.btn-primary {
      background-color: $accent-main;
    }
  }
}
</style>
