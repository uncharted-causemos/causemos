import { Indicator, Model } from '../../types/Datacube';
import { computed, Ref } from 'vue';
import { DatacubeStatus } from '@/types/Enums';

export default function useDatacubeVersioning(
  metadata: Ref<Model | Indicator | null>
) {
  const statusColor = computed(() => {
    let color = 'red';
    if (metadata.value === null) return color;
    switch (metadata.value.status) {
      case DatacubeStatus.Ready:
        color = 'lightgreen';
        break;
      case DatacubeStatus.Registered:
        color = 'lightgray';
        break;
      case DatacubeStatus.Deprecated:
        color = 'lightblue';
        break;
      default:
        color = 'red';
    }
    return color;
  });
  const statusLabel = computed(() => {
    let label = '';
    if (metadata.value === null) return label;
    switch (metadata.value.status) {
      case DatacubeStatus.Ready:
        label = 'Published';
        break;
      case DatacubeStatus.Registered:
        label = 'Registered';
        break;
      case DatacubeStatus.Deprecated:
        label = 'Deprecated';
        break;
      default:
        label = metadata.value.status;
    }
    return label;
  });

  return {
    statusColor,
    statusLabel
  };
}
