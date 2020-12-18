<template>
  <div class="full-screen-modal-header-container">
    <close-button
      class="close-button"
      @click="close"
    />
    <div>
      <i
        v-if="icon !== null"
        class="fa fa-fw"
        :class="`fa-${icon}`"
      />
      <span class="title">{{ title }}</span>
    </div>
  </div>
</template>

<script>
import CloseButton from '@/components/widgets/close-button';

export default {
  name: 'FullScreenModalHeader',
  components: {
    CloseButton
  },
  props: {
    icon: {
      type: String,
      default: null
    },
    title: {
      type: String,
      default: ''
    }
  },
  methods: {
    close() {
      this.$emit('close');
    }
  }
};
</script>

<style lang="scss" scoped>

.full-screen-modal-header-container {
  background-color: #0e3480;
  display: flex;
  align-items: center;
  color: #FFFFFF;
  min-height: 48px;
  position: relative;

  & > * {
    margin: 0 15px;

    &:first-child {
      margin-left: 0;
    }

    &:last-child {
      margin-right: 0;
    }
  }
}

.close-button {
  right: auto;
  top: auto;
  position: relative;
  height: 48px;
  width: 48px;

  &:hover {
    color: #FFFFFF;
  }
}

.title {
  font-weight: 600;
  font-size: 16px;
  margin-left: 5px;
}
</style>
