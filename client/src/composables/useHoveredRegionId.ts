import { ref } from 'vue';

export default function useHoveredRegionId() {
  const hoveredRegionId = ref<string | null>(null);
  const highlightRegion = (regionId: string) => {
    hoveredRegionId.value = regionId;
  };
  const clearRegionHighlight = () => {
    hoveredRegionId.value = null;
  };

  return {
    hoveredRegionId,
    highlightRegion,
    clearRegionHighlight,
  };
}
