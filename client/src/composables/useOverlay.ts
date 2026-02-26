import { useAppStore } from '@/stores/app-store';

export default function useOverlay() {
  const appStore = useAppStore();
  const enable = (title?: string) => appStore.enableOverlay(title);
  const disable = () => appStore.disableOverlay();
  return {
    enable,
    disable,
  };
}
