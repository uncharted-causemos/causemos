<template>
  <div>
    <insight-control-menu />
    <insight-manager />
  </div>
</template>

<script>
import InsightControlMenu from '@/components/insight-manager/insight-control-menu';
import InsightManager from '@/components/insight-manager/insight-manager';

export default {
  name: 'InsightControls',
  components: {
    InsightControlMenu,
    InsightManager
  }
};
</script>
