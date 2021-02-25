<template>
  <div class="full-screen-modal-header-container">
    <div
      class="title"
      @click="close">
      <i
        v-if="icon !== null"
        class="fa fa-fw"
        :class="`fa-${icon}`"
      />
      <span>{{ title }}</span>
    </div>
    <div class="centered">
      <slot />
    </div>
    <slot name="trailing" />
  </div>
</template>

<script>

export default {
  name: 'FullScreenModalHeader',
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
  min-height: 48px;
  position: relative;

  & > * {
    margin: 0 15px;

    &:first-child {
      margin-left: 10;
    }

    &:last-child {
      margin-right: 0;
    }
  }
}

.title {
  font-weight: 600;
  font-size: 16px;
  color: #FFFFFF;
  cursor: pointer;
  i {
    margin-right: 5px;
  }
}

.title:hover {
  text-decoration: underline;
}

.centered {
  flex-grow: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #FFFFFF;
}

</style>
