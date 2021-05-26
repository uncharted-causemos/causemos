<template>
  <div class="document-view-container h-100 flex flex-col">
    <documents-list-tableview
      :documentData="documentData"
    />
  </div>
</template>

<script>

import _ from 'lodash';
import { mapActions, mapGetters } from 'vuex';
import API from '@/api/api';
import filtersUtil from '@/utils/filters-util';
import { toCardsData, toCardData } from '@/utils/document-util';
import DocumentsListTableview from '@/components/kb-explorer/documents-list-tableview';
import { createPDFViewer } from '@/utils/pdf/viewer';

const isPdf = (card) => {
  return card.data.metadata && card.data.metadata['File type'] === 'application/pdf';
};

const READER_TRANSITION_DURATION = 300;
const displayOptions = {
  SHOWCARDS: 'cards',
  SHOWTABLE: 'table'
};

export default {
  name: 'DocumentsView',
  components: {
    DocumentsListTableview
  },
  props: {
    displayOptions: {
      type: Object,
      default: displayOptions
    },
    displayCards: {
      type: String,
      default: displayOptions.SHOWTABLE
    }
  },
  data: () => ({
    cardsConfig: {
      'card.width': 210,
      'card.height': 200,
      'card.disableFlipping': true,
      'card.displayBackCardByDefault': true,
      'verticalReader.height': 680
    },
    cardsData: [],
    documentData: []
  }),
  computed: {
    ...mapGetters({
      filters: 'query/filters',
      documentsQuery: 'query/documents',
      project: 'app/project',
      documentsCount: 'kb/documentsCount'
    }),
    pageFrom() {
      return this.documentsQuery.from;
    },
    pageSize() {
      return this.documentsQuery.size;
    },
    sort() {
      return this.documentsQuery.sort;
    }
  },
  watch: {
    filters(n, o) {
      if (filtersUtil.isEqual(n, o)) return;
      this.refresh();
    },
    documentsQuery(n, o) {
      if (_.isEqual(n, o)) return;
      this.refresh();
    }
  },
  mounted () {
    this.refresh();
  },
  methods: {
    ...mapActions({
      enableOverlay: 'app/enableOverlay',
      disableOverlay: 'app/disableOverlay'
    }),
    refresh() {
      this.refreshcardsData();
    },
    refreshcardsData() {
      this.enableOverlay('Refreshing...');
      const url = `projects/${this.project}/documents/`;
      const params = {
        filters: this.filters,
        from: this.pageFrom,
        size: this.pageSize,
        sort: this.sort
      };
      API.get(url, { params }).then(d => {
        this.documentData = d.data;
        console.log(`DOCS: ${this.documentData.length}`);
        this.cardsData = toCardsData(d.data);
        this.disableOverlay();
      });
    },
    async fetchReaderContentRawDoc(targetCard) {
      if (!isPdf(targetCard)) return;
      const url = `/api/dart/${targetCard.data.id}/raw`;
      try {
        const viewer = await createPDFViewer({ url });
        return viewer;
      } catch (error) {
      }
    },
    async fetchReaderContentData(targetCard) {
      const docId = targetCard.data.id;
      const url = `documents/${docId}`;
      const { data } = await API.get(url);
      const { content } = data ? toCardData(data) : { content: '' };
      return content;
    },
    async fetchReaderContent(targetCard) {
      const customElementObj = await this.fetchReaderContentRawDoc(targetCard);
      const content = await this.fetchReaderContentData(targetCard);
      return {
        customElementObj,
        content
      };
    },
    async updateReaderContent(targetCard) {
      this.$refs.cards.updateReaderContent(targetCard, 'Loading...', { switchButton: false });
      const { customElementObj, content } = await this.fetchReaderContent(targetCard);
      if (customElementObj) {
        // NOTE: rendering pages is expensive so that it makes reader's opening animation sluggish.
        // So give some time for reader to finish it's transition and then start rendering pages
        await new Promise(resolve => setTimeout(resolve, READER_TRANSITION_DURATION));
        this.$refs.cards.updateReaderContent(targetCard, content);
        isPdf(targetCard) && customElementObj.renderPages();
        return this.$refs.cards.updateReaderContentCustomElement(targetCard, customElementObj.element);
      }
      this.$refs.cards.updateReaderContent(targetCard, content, { switchButton: false });
    },
    onCardClick(targetCard) {
      this.$refs.cards.openReader(targetCard);
      this.updateReaderContent(targetCard);
    }
  }
};
</script>


<style scoped lang="scss">

.document-view-container {
  padding: 8px;
}

</style>
