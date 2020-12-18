import { shallowMount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import { expect } from 'chai';
import HistogramFacets from '@/components/facets/histogram-facets';
import FiltersUtil from '@/utils/filters-util';

const localVue = createLocalVue();
localVue.use(Vuex);

describe('histogram-facets', () => {
  // Mock
  let store;

  const baseData = [
    { key: 0, startValue: 0, endValue: 0.1, value: 10 },
    { key: 0.1, startValue: 0.1, endValue: 0.3, value: 10 },
    { key: 0.2, startValue: 0.2, endValue: 0.3, value: 10 }
  ];

  const selectedData = [
    { key: 0, startValue: 0, endValue: 0.1, value: 0 },
    { key: 0.1, startValue: 0.1, endValue: 0.3, value: 10 },
    { key: 0.2, startValue: 0.2, endValue: 0.3, value: 0 }
  ];

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
    const f = shallowMount(HistogramFacets, {
      propsData: {
        facet: 'test',
        label: 'Test',
        baseData: baseData,
        selectedData: selectedData
      },
      store,
      localVue
    });
    expect(f.findAll('.facet-histogram-bar').length).to.equal(3);
  });
});
