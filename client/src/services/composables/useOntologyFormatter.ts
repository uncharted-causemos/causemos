import { useStore } from 'vuex';
import { conceptHumanName } from '@/utils/concept-util';

export default function useOntologyFormatter() {
  const store = useStore();
  return (v: string) => {
    return conceptHumanName(v, store.getters['app/ontologySet']);
  };
}
