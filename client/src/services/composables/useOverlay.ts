import { useStore } from 'vuex';

export default function useOverlay() {
  const store = useStore();
  const enable = () => store.dispatch('app/enableOverlay');
  const disable = () => store.dispatch('app/disableOverlay');
  return {
    enable,
    disable,
  };
}
