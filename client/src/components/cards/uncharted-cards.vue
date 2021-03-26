<template>
  <div
    class="uncharted-cards-container"
    :class="classObject" />
</template>

<script>

import _ from 'lodash';
import Cards from '@uncharted.software/cards';
import { createReaderSwitchButton } from '@/utils/uncharted-cards-util';
import { removeChildren } from '@/utils/dom-util';

const DEFAULT_CARDS_CONFIG = {
  'inlineMode': false,
  'subtitleDelimiter': ' \u2022 ',
  'scrollToVerticalReaderDuration': 300,
  'inlineCardCenteringDuration': 300,
  'card.width': 230,
  'card.height': 200,
  'card.enableBoxShadow': true,
  'card.expandedWidth': 520,
  'card.disableFlipping': false,
  'card.displayBackCardByDefault': true,
  'card.disableLinkNavigation': false,
  'card.displayLargeImage': false,
  'card.metadata.fontSize': 10,
  'card.metadata.title.color': '#bbb',
  'card.metadata.title.fontFamily': 'inherit',
  'card.metadata.value.color': '#000',
  'card.metadata.value.fontFamily': 'inherit',
  'verticalReader.height': 500,
  'readerContent.headerBackgroundColor': '#555',
  'readerContent.headerSourceLinkColor': '#fff',
  'readerContent.disableLinkNavigation': false,
  'readerContent.cropImages': true
};

// Vue wrapper for unchard cards component
export default {
  name: 'UnchartedCards',
  props: {
    data: {
      type: Array,
      default: () => []
    },
    config: {
      type: Object,
      default: () => ({})
    }
  },
  data: () => ({
    classObject: {
      'no-reader-padding': false
    },
    readerContent: null,
    customReaderContentElement: null,
    switchButton: null
  }),
  computed: {
    cardsConfig () {
      return Object.assign({}, DEFAULT_CARDS_CONFIG, this.config);
    }
  },
  watch: {
    data(o, n) {
      if (_.isEqual(n, o)) return;
      this.refresh();
    },
    config(o, n) {
      if (_.isEqual(n, o)) return;
      removeChildren(this.$el).append(this.cards.reset(this.cardsConfig).render()[0]);
      this.refresh();
    }
  },
  mounted () {
    this.cards = new Cards(this.cardsConfig);
    this.$el.append(this.cards.render()[0]);
    window.addEventListener('resize', this.resize);

    this.registerCardsEvents();
    this.refresh();
  },
  unmounted() {
    this.destroyReaderSwitchButton();
    window.removeEventListener('resize', this.resize);
  },
  methods: {
    resize() {
      // ensure resize happens once per frame
      if (this._resizeAnimationFrame) {
        cancelAnimationFrame(this._resizeAnimationFrame);
      }
      this._resizeAnimationFrame = requestAnimationFrame(() => {
        this.cards.resize();
      });
    },
    refresh() {
      this.cards.loadData(this.data);
    },
    openReader(targetCard) {
      if (!targetCard.isExpanded) {
        this.cards.openReader(targetCard);
      }
    },
    updateReaderContent(targetCard, content, { switchButton } = { switchButton: true }) {
      this.classObject['no-reader-padding'] = false;
      this.readerContent = content;
      this.cards.updateReaderContent(targetCard, Object.assign({}, targetCard.data, { content }));

      if (!this.customReaderContentElement || !switchButton) return;

      this.destroyReaderSwitchButton();
      this.switchButton = createReaderSwitchButton({
        parentElement: this.cards.$element[0],
        onClick: () => this.updateReaderContentCustomElement(targetCard, this.customReaderContentElement),
        isOn: false
      });
    },
    updateReaderContentCustomElement(targetCard, element) {
      const selectedFields = _.pick(targetCard.data, ['id', 'source', 'sourceUrl', 'metadata']);
      this.classObject['no-reader-padding'] = true;
      this.customReaderContentElement = element;
      this.cards.updateReaderContent(targetCard, selectedFields);
      this.cards.wrappedCardsView.verticalReader.$element.find('.reader-content-container .content').html(element);

      this.destroyReaderSwitchButton();
      this.switchButton = createReaderSwitchButton({
        parentElement: this.cards.$element[0],
        onClick: () => this.updateReaderContent(targetCard, this.readerContent),
        isOn: true
      });
    },
    destroyReaderSwitchButton() {
      this.switchButton && this.switchButton.destroy();
      this.switchButton = null;
    },
    registerCardsEvents() {
      this.cards.on('card:click', card => {
        this.$emit('card-click', card);
      });

      this.cards.on('verticalReader:navigateToCard', card => {
        this.$emit('card-navigate', card);
      });

      this.cards.on('readerContent:clickCloseButton cards:clickBackground verticalReader:clickBackground', () => {
        this.cards.closeReader();
        this.destroyReaderSwitchButton();
      });
    }
  }
};

</script>

<style lang="scss" scoped>
  .uncharted-cards-container {
    &.no-reader-padding /deep/ .reader-content-body {
      padding-top: 0;
      padding-right: 0;
      padding-left: 0;
    }
    /deep/ .uncharted-cards-vertical-reader .marker {
      z-index: 10;
    }
    /deep/ .uncharted-cards-reader-content .content {
      word-break: break-word;
    }
    /deep/ .uncharted-cards-reader-content .source-icon {
      display: none;
    }
    /deep/ .uncharted-cards-reader-content .reader-content-header {
      // TODO: instead of overriding z-index value here, experiment with right z-index value and update it in the card component library
      z-index: 40;
      .close-button i  {
        padding-right: 12px;
      }
    }
  }
</style>
