import { shallowMount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import { expect } from 'chai';
import Facets from '@/components/facets/facets';
import FiltersUtil from '@/utils/filters-util';

const localVue = createLocalVue();
localVue.use(Vuex);

describe('facets', () => {
  // Mock
  let store;

  const baseData = [
    { key: 'a', value: 10 },
    { key: 'b', value: 20 },
    { key: 'c', value: 30 },
    { key: 'd', value: 40 },
    { key: 'e', value: 50 },
    { key: 'f', value: 60 },
    { key: 'g', value: 70 }
  ];

  const selectedData = [
    { key: 'a', value: 1 },
    { key: 'b', value: 2 },
    { key: 'c', value: 3 },
    { key: 'd', value: 4 },
    { key: 'e', value: 5 },
    { key: 'f', value: 6 },
    { key: 'g', value: 7 }
  ];

  const DEFAULT_MAX = 5;

  beforeEach(() => {
    store = new Vuex.Store({
      namespaced: true,
      modules: {
        query: {
          namespaced: true,
          getters: {
            filters: () => FiltersUtil.newFilters()
          }
        }
      }
    });
  });

  it('facet renders default', () => {
    const f = shallowMount(Facets, {
      propsData: {
        facet: 'test',
        label: 'Test',
        baseData: baseData,
        selectedData: selectedData
      },
      store,
      localVue
    });
    expect(f.findAll('.facets-facet-vertical').length).to.equal(DEFAULT_MAX);
  });
});
