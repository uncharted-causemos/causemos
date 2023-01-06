import { Indicator, Model } from '../../types/Datacube';
import { computed, Ref } from 'vue';
import { getDatacubeStatusInfo } from '@/utils/datacube-util';

export default function useDatacubeVersioning(metadata: Ref<Model | Indicator | null>) {
  const statusColor = computed(() => {
    if (metadata.value === null) return 'red';
    return getDatacubeStatusInfo(metadata.value.status).color;
  });
  const statusLabel = computed(() => {
    if (metadata.value === null) return '';
    return getDatacubeStatusInfo(metadata.value.status).label;
  });

  return {
    statusColor,
    statusLabel,
  };
}
