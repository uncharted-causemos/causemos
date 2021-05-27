<template>
  <div
    class="uncharted-cards-reader-content-container uncharted-cards-style"
    :class="classObject" />
</template>

<script>

import _ from 'lodash';
import { ReaderContent } from '@uncharted.software/cards';
import { createReaderSwitchButton } from '@/utils/uncharted-cards-util';
import { removeChildren } from '@/utils/dom-util';

const DEFAULT_READER_CONTENT_CONFIG = {
  'subtitleDelimiter': ' \u2022 ',
  'card.metadata.fontSize': 10,
  'card.metadata.title.color': '#bbb',
  'card.metadata.title.fontFamily': 'inherit',
  'card.metadata.value.color': '#000',
  'card.metadata.value.fontFamily': 'inherit',
  'readerContent.headerBackgroundColor': '#555',
  'readerContent.headerSourceLinkColor': '#fff',
  'readerContent.disableLinkNavigation': false,
  'readerContent.cropImages': true
};

// Vue wrapper for uncharted cards component
export default {
  name: 'DocumentsReaderContent',
  props: {
    data: {
      type: Object,
      default: () => ({})
    },
    switchButtonData: {
      type: Object,
      default: () => ({
        show: false,
        tooltip: '',
        onClick: () => {}
      })
    },
    config: {
      type: Object,
      default: () => ({})
    }
  },
  data: () => ({
    classObject: {
      'no-reader-padding': false
    }
  }),
  computed: {
    readerContentConfig () {
      return Object.assign({}, DEFAULT_READER_CONTENT_CONFIG, this.config);
    }
  },
  watch: {
    data(o, n) {
      if (_.isEqual(n, o)) return;
      this.refresh();
    },
    switchButtonData(o, n) {
      if (_.isEqual(n, o)) return;
      this.renderSwitchButton();
    },
    config(o, n) {
      if (_.isEqual(n, o)) return;
      this.refresh();
    }
  },
  mounted () {
    this.readerContent = new ReaderContent();
    this.registerEvents();
    this.refresh();
    this.renderSwitchButton();
  },
  unmounted() {
    this.destroySwitchButton();
  },
  methods: {
    refresh() {
      // remove child nodes (single reader content node in this case)
      removeChildren(this.$el);
      const content = this.data.content;
      const isContentCustomElement = content instanceof Element || content instanceof HTMLDocument;
      // render and mount the reader content element to the dom
      this.readerContent.reset({
        config: this.readerContentConfig,
        data: isContentCustomElement ? _.pick(this.data, ['id', 'source', 'sourceUrl', 'metadata']) : this.data
      }).render();
      this.classObject['no-reader-padding'] = false;
      if (isContentCustomElement) {
        this.classObject['no-reader-padding'] = true;
        this.readerContent.$element.find('.content').html(content);
      }
      this.$el.appendChild(this.readerContent.$element[0]);
    },
    renderSwitchButton() {
      if (this.switchButtonData.show) {
        this.destroySwitchButton();
        this.switchButton = createReaderSwitchButton({
          parentElement: this.$el,
          description: this.switchButtonData.tooltip,
          onClick: () => this.switchButtonData.onClick(),
          isOn: this.switchButtonData.isOn
        });
      } else {
        this.destroySwitchButton();
      }
    },
    destroySwitchButton() {
      this.switchButton && this.switchButton.destroy();
      this.switchButton = null;
    },
    registerEvents() {
      this.readerContent.on('readerContent:clickCloseButton', () => {
        this.$emit('click-close-icon');
      });
    }
  }
};
</script>

<style lang="scss" scoped>
  .uncharted-cards-reader-content-container {
    &.no-reader-padding ::v-deep(.reader-content-body) {
      padding-top: 0;
      padding-right: 0;
      padding-left: 0;
    }
    ::v-deep(.uncharted-cards-reader-content) {
      .content {
        word-break: break-word;
      }
      .source-icon {
        display: none;
      }
    }
  }
</style>
