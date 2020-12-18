import { shallowMount } from '@vue/test-utils';
import { expect } from 'chai';
import AutoComplete from '@/components/widgets/autocomplete/autocomplete';

const suggestionItems = ['abc', 'abcd', '123', '321', 'xyz'];
const searchFn = async (v) => {
  const r = suggestionItems.filter(d => {
    return d.includes(v);
  });
  return r;
};

describe('autocomplete', () => {
  it('shows nothing by default', () => {
    const t = shallowMount(AutoComplete, {
      propsData: { searchFn }
    });
    expect(t.findAll('li').length).to.equal(0);
  });

  it('show some matches', (done) => {
    const t = shallowMount(AutoComplete, {
      propsData: { searchFn }
    });
    const inputElement = t.find('input');
    inputElement.element.value = 'ab';
    inputElement.trigger('input');

    t.vm.$nextTick(() => {
      expect(t.findAll('li').length).to.equal(2);
      done();
    });
  });

  it('show no matches', (done) => {
    const t = shallowMount(AutoComplete, {
      propsData: { searchFn }
    });
    const inputElement = t.find('input');
    inputElement.element.value = 'abcde';
    inputElement.trigger('input');
    t.vm.$nextTick(() => {
      expect(t.findAll('li').length).to.equal(0);
      done();
    });
  });
});
