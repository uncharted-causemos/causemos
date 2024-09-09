import { useStore } from 'vuex';

export default function useOverlay() {
  const store = useStore();
  const enable = (title?: string) => store.dispatch('app/enableOverlay', title);
  const disable = () => store.dispatch('app/disableOverlay');
  return {
    enable,
    disable,
  };
}
