<template>
  <div class="documents-container">
    <main>
      <header>
        <HeaderIcon :icon="'book'" />
        <div>
          <h3>Documents</h3>
          <p class="subdued">
            {{ documentCount === null ? '...' : numberFormatter(documentCount) }}
          </p>
        </div>
      </header>
      <div class="search-bar-row">
        <div class="search-bar first-column-width">
          <i class="fa fa-search subdued" />
          <input type="text" v-model="searchBarText" placeholder="Search" />
        </div>
        <a :href="applicationConfiguration.CLIENT__DOJO_UPLOAD_DOCUMENT_URL" target="_blank">
          <button class="btn btn-call-to-action default-column-width">Upload documents</button>
        </a>
      </div>
      <document-list
        v-if="searchBarText.length === 0"
        :document-count="documentCount"
        class="take-remaining-height"
        @set-document-count="(newCount) => (documentCount = newCount)"
      />
      <paragraph-search-result-list
        v-else
        class="take-remaining-height"
        :search-bar-text="searchBarText"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import DocumentList from '@/components/documents/DocumentList.vue';
import ParagraphSearchResultList from '@/components/documents/ParagraphSearchResultList.vue';
import HeaderIcon from '@/components/widgets/header-icon.vue';
import numberFormatter from '@/formatters/number-formatter';
import useApplicationConfiguration from '@/services/composables/useApplicationConfiguration';

import { ref } from 'vue';

const searchBarText = ref('');

const documentCount = ref<number | null>(null);

const { applicationConfiguration } = useApplicationConfiguration();
</script>

<style lang="scss" scoped>
@import '@/styles/variables';
@import '@/styles/uncharted-design-tokens';
@import '@/styles/documents';
.documents-container {
  background: white;
  height: $content-full-height;
  position: relative;
}

main {
  max-width: 960px;
  height: 100%;
  margin: 0 auto 0;
  padding: 80px 0 140px;
  display: flex;
  flex-direction: column;
}

header {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.search-bar {
  display: flex;
  position: relative;
  align-items: center;

  input {
    flex: 1;
    min-width: 0;
    padding: 5px;
    padding-left: 30px;
    border: 1px solid $un-color-black-10;
    border-radius: 2px;
  }

  i {
    position: absolute;
    left: 10px;
  }
}

.take-remaining-height {
  flex: 1;
  min-height: 0;
}

.search-bar-row {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
  margin-bottom: 10px;
}
</style>
