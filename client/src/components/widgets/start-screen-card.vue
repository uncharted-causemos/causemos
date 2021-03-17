<template>
  <card @click="onCardClick">
    <div
      v-if="isCreateCard"
      class="centered"
    >
      <i
        class="fa fa-fw fa-plus card-icon"
      />
      <h4 class="card-title">New</h4>
    </div>
    <div
      v-if="!isCreateCard"
      class="recent-card"
    >
      <div
        class="preview"
        :class="{ 'no-image': !hasImage }"
      >
        <img
          v-if="hasImage"
          :src="previewImageSrc"
          :alt="'Preview of ' + title"
        >
      </div>
      <h5 class="card-title">{{ title }}</h5>
      <h6 class="subtitle">{{ subtitle }}</h6>
      <options-button class="menu">
        <template #content>
          <p
            class="dropdown-option"
            @click="onRename"
          >Rename</p>
          <p
            class="dropdown-option"
            @click="onDuplicate"
          >Duplicate</p>
          <p
            class="dropdown-option"
            @click="onDelete"
          >Delete</p>
        </template>
      </options-button>
    </div>
  </card>
</template>

<script>
import _ from 'lodash';
import Card from '@/components/widgets/card';
import OptionsButton from '@/components/widgets/options-button';

export default {
  name: 'StartScreenCard',
  components: {
    Card,
    OptionsButton
  },
  props: {
    isCreateCard: {
      type: Boolean,
      default: false
    },
    previewImageSrc: {
      type: String,
      default: ''
    },
    title: {
      type: String,
      default: 'Card Title'
    },
    subtitle: {
      type: String,
      default: 'Card Subtitle'
    }
  },
  emits: [
    'click', 'rename', 'duplicate', 'delete'
  ],
  computed: {
    hasImage() {
      return !_.isNil(this.previewImageSrc);
    }
  },
  methods: {
    onCardClick() {
      this.$emit('click');
    },
    onRename() {
      this.$emit('rename');
    },
    onDuplicate() {
      this.$emit('duplicate');
    },
    onDelete() {
      this.$emit('delete');
    }
  }
};
</script>
<style lang="scss" scoped>
  @import "~styles/variables";

  .card-container {
    height: 233px;
    min-width: 233px;
    width: calc(25vw - (2 * 32px));
    padding: 8px;
  }

  * {
    margin: 0;
  }

  .centered {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);

    h4 {
      text-align: center;
    }

    .card-icon {
      font-size: 64px;
      color: #255DCC;
      transition: all 0.15s;
    }
  }

  .card-container:hover .card-icon {
    color: lighten(#255DCC, 10%);
  }

  .recent-card {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;

    .preview {
      flex: 1 1 0;
      width: 100%;
      margin-bottom: 8px;
      // Allow flex item to be smaller than it's children
      //  (in case child image is too big)
      min-height: 0;

      img {
        // Clip images that are too big, but maintain aspect ratio
        object-fit: cover;
        width: 100%;
        height: 100%
      }

      &.no-image {
        // Fallback value; previews should always be provided an image
        background: #EAEBEC;
      }
    }

    .subtitle {
      font-size: $font-size-small;
      color: $label-color;
      font-weight: normal;
    }

    .menu {
      position: absolute;
      right: 4px;
      bottom: 4px;
    }

  }

  .card-title {
    font-weight: normal;
  }
</style>
