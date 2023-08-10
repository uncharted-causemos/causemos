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
      <div class="search-bar first-column-width">
        <i class="fa fa-search subdued" />
        <input type="text" :value="searchBarText" placeholder="Search" />
      </div>
      <div class="table-row table-header">
        <div class="first-column-width">
          <sortable-table-header-cell
            class="header-cell"
            :active-state="getHeaderCellSortState(DocumentSortField.Title)"
            :label="'Title'"
            :up-label="'Sort from A-Z'"
            :down-label="'Sort from Z-A'"
            @set-sort="(order) => setSortColumnAndOrder(DocumentSortField.Title, order)"
          />
        </div>
        <div class="second-column-width">
          <sortable-table-header-cell
            class="header-cell"
            :active-state="getHeaderCellSortState(DocumentSortField.Producer)"
            :label="'Publisher'"
            :up-label="'Sort from A-Z'"
            :down-label="'Sort from Z-A'"
            @set-sort="(order) => setSortColumnAndOrder(DocumentSortField.Producer, order)"
          />
        </div>
        <div class="default-column-width">
          <sortable-table-header-cell
            class="header-cell"
            :active-state="getHeaderCellSortState(DocumentSortField.CreationDate)"
            :label="'Date created'"
            :up-label="'Sort by oldest'"
            :down-label="'Sort by most recent'"
            @set-sort="(order) => setSortColumnAndOrder(DocumentSortField.CreationDate, order)"
          />
        </div>
        <div class="default-column-width">
          <sortable-table-header-cell
            class="header-cell"
            :active-state="getHeaderCellSortState(DocumentSortField.UploadDate)"
            :label="'Date uploaded'"
            :up-label="'Sort by oldest'"
            :down-label="'Sort by most recent'"
            @set-sort="(order) => setSortColumnAndOrder(DocumentSortField.UploadDate, order)"
          />
        </div>
      </div>
      <div class="table-rows">
        <div class="table-row" v-for="document of visibleDocumentPages" :key="document.id">
          <span class="first-column-width">{{ document.title }}</span>
          <span class="second-column-width subdued">{{ document.producer }}</span>
          <span class="default-column-width subdued">{{
            document.creation_date === null ? '--' : DATE_FORMATTER(document.creation_date)
          }}</span>
          <span class="default-column-width subdued">{{
            document.processed_at === null ? '--' : DATE_FORMATTER(document.processed_at)
          }}</span>
        </div>
      </div>
      <div class="table-footer">
        <i
          class="fa fa-chevron-left arrow-button"
          :class="[currentPageIndex === 0 ? 'disabled' : '']"
          @click="goToPreviousPage"
        />
        <span class="subdued">{{ paginationText }}</span>
        <i
          class="fa fa-chevron-right arrow-button"
          :class="[isNextPageButtonDisabled ? 'disabled' : '']"
          @click="goToNextPage"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import HeaderIcon from '@/components/widgets/header-icon.vue';
import SortableTableHeaderCell from '@/components/widgets/sortable-table-header-cell.vue';
import dateFormatter from '@/formatters/date-formatter';
import numberFormatter from '@/formatters/number-formatter';
import {
  getDocuments,
  DocumentSortField,
  DocumentSortOrderOption,
} from '@/services/paragraphs-service';
import { SortableTableHeaderState } from '@/types/Enums';
import { Document } from '@/types/IndexDocuments';
import { computed, ref, watch } from 'vue';
const DATE_FORMATTER = (value: any) => dateFormatter(value, 'MMMM DD, YYYY');

const searchBarText = ref('');
const documentCount = ref<number | null>(null);
const currentPageIndex = ref(0);
const goToPreviousPage = () => {
  currentPageIndex.value = currentPageIndex.value - 1;
};
const goToNextPage = () => {
  currentPageIndex.value = currentPageIndex.value + 1;
};
const DOCUMENT_COUNT_PER_PAGE = 100;
const documentPages = ref<Document[][]>([]);
const visibleDocumentPages = computed<Document[]>(() =>
  currentPageIndex.value > documentPages.value.length - 1
    ? []
    : documentPages.value[currentPageIndex.value]
);
const scrollId = ref<string | null>('');

const columnToSortBy = ref(DocumentSortField.UploadDate);
const sortOrder = ref(DocumentSortOrderOption.Descending);
const setSortColumnAndOrder = (column: DocumentSortField, order: SortableTableHeaderState) => {
  columnToSortBy.value = column;
  sortOrder.value =
    order === SortableTableHeaderState.Up
      ? DocumentSortOrderOption.Ascending
      : DocumentSortOrderOption.Descending;
};
const getHeaderCellSortState = (cell: DocumentSortField) => {
  if (columnToSortBy.value !== cell) {
    return SortableTableHeaderState.None;
  }
  return sortOrder.value === DocumentSortOrderOption.Ascending
    ? SortableTableHeaderState.Up
    : SortableTableHeaderState.Down;
};

const paginationText = computed(() => {
  if (documentCount.value === null) {
    return '...';
  }
  const firstDisplayedDocumentIndex = currentPageIndex.value * DOCUMENT_COUNT_PER_PAGE + 1;
  const lastDocumentIndexIfNotLastPage = firstDisplayedDocumentIndex + DOCUMENT_COUNT_PER_PAGE - 1;
  const lastDisplayedDocumentIndex =
    lastDocumentIndexIfNotLastPage > documentCount.value
      ? documentCount
      : lastDocumentIndexIfNotLastPage;
  return `${firstDisplayedDocumentIndex} - ${lastDisplayedDocumentIndex} of ${numberFormatter(
    documentCount.value
  )}`;
});

const isNextPageButtonDisabled = computed(
  () => currentPageIndex.value > documentPages.value.length - 1 || scrollId.value === null
);

watch([columnToSortBy, sortOrder], () => {
  // When sort state changes, reset pagination state.
  documentPages.value = [];
  currentPageIndex.value = 0;
  scrollId.value = '';
});

watch(
  [currentPageIndex, columnToSortBy, sortOrder],
  async () => {
    // Make sure the current and next pages are fetched.
    // This improves the user experience by always having the next page ready to present.
    // User only sees a blank "loading" state if they click the "next" button twice rapidly.
    // If the user is navigating to a page they've already seen, no new fetch will occur.
    while (documentPages.value.length < currentPageIndex.value + 2) {
      if (scrollId.value === null) {
        // Shouldn't occur; "next page" button should be disabled if we're on the last page
        return;
      }
      const result = await getDocuments(
        scrollId.value,
        DOCUMENT_COUNT_PER_PAGE,
        columnToSortBy.value,
        sortOrder.value
      );
      documentCount.value = parseInt(result.hits);
      documentPages.value = [...documentPages.value, result.results];
      scrollId.value = result.scroll_id;
    }
  },
  { immediate: true }
);
</script>

<style lang="scss" scoped>
@import '@/styles/variables';
@import '@/styles/uncharted-design-tokens';
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
  margin-top: 20px;

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

.first-column-width {
  width: 330px;
}

.second-column-width {
  width: 300px;
}

.default-column-width {
  width: 150px;
}

.table-rows {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.table-row {
  display: flex;
  gap: 10px;
  padding: 10px 0;
  border-top: 1px solid $un-color-black-10;
}

.table-header {
  margin-top: 10px;
  border-top: none;
  border-bottom: 1px solid $un-color-black-10;
  padding-bottom: 5px;

  & > * {
    display: flex;
    justify-content: flex-start;
  }
}

.table-footer {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;

  span {
    // Reduce jumping when switching between pages with different numbers of digits
    min-width: 120px;
    text-align: center;
  }
}

.arrow-button {
  color: $un-color-black-70;
  padding: 10px;
  cursor: pointer;

  &:hover {
    color: black;
  }

  &.disabled,
  &.disabled:hover {
    cursor: default;
    color: $un-color-black-20;
  }
}
</style>
