import { createLocalVue, shallowMount } from '@vue/test-utils';
import { expect } from 'chai';
import FiltersDisplay from '@/components/widgets/filters-display';
import FilterKeyFormatter from '@/filters/filter-key-formatter';
import FilterValueFormatter from '@/filters/filter-value-formatter';

const filters1 = {
  clauses: [
    {
      field: 'abc', values: [1, 2, 3], isNot: false, operand: 'or'
    }
  ]
};

describe('filters-display', () => {
  const localVue = createLocalVue();
  localVue.filter('filter-key-formatter', FilterKeyFormatter);
  localVue.filter('filter-value-formatter', FilterValueFormatter);

  it('creates correct templates', () => {
    const ci = shallowMount(FiltersDisplay, {
      localVue,
      propsData: {
        filters: filters1
      }
    });
    expect(ci.findAll('.filters-clause').length).to.equal(1);
  });
});
