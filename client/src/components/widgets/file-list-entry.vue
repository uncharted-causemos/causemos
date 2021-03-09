<template>
  <div
    class="file-list-entry-container"
    @click="onContainerClick"
  >
    <h6>{{ title }}</h6>
    <p>{{ subtitle }}</p>
    <div
      class="menu"
      :class="{ active: isMenuOpen }"
      @click="onMenuClick"
    >
      <i
        class="fa fa-fw fa-ellipsis-v"
      />
      <dropdown-control
        v-if="isMenuOpen"
      >
        <div
          slot="content"
        >
          <p
            class="dropdown-option"
            @click="onAppend"
          ><i class="fa fa-fw fa-plus-circle" />Append</p>
          <p
            class="dropdown-option"
            @click="onDelete"
          ><i class="fa fa-fw fa-trash" />Delete</p>
        </div>
      </dropdown-control>
    </div>
  </div>
</template>

<script>
import DropdownControl from '@/components/dropdown-control';

export default {
  name: 'FileListEntry',
  components: {
    DropdownControl
  },
  props: {
    title: {
      type: String,
      default: 'Card Title'
    },
    subtitle: {
      type: String,
      default: 'Card Subtitle'
    }
  },
  data: () => ({
    isMenuOpen: false
  }),
  methods: {
    onMenuClick(event) {
      this.isMenuOpen = !this.isMenuOpen;
      event.stopPropagation();
    },
    onContainerClick() {
      this.$emit('click');
    },
    onAppend() {
      this.$emit('append');
    },
    onDelete() {
      this.$emit('delete');
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.file-list-entry-container {
  position: relative;
  padding: 12px 20px;
  border-bottom: 1px solid $separator;

  &:hover {
    background: #F0F1F2;
    cursor: pointer;

    .menu {
      display: block;
    }
  }
}

h6, p {
  margin: 0;
}

.menu {
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: none;

  & > i {
    text-align: center;
    width: 100%;
    font-size: 18px;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    color: #9D9E9E;
  }

  .dropdown-container {
    position: absolute;
    top: 50%;
    right: 100%;
    padding: 0;
    width: 100px;
    // Clip children overflowing the border-radius at the corners
    overflow: hidden;

    i {
      padding-right: 4px;
    }
  }

  &.active, &:hover {
    background:#EAEBEC;

    i {
      color: #000000;
    }
  }
}

</style>
