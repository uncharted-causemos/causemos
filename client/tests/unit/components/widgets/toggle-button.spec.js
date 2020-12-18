import { shallowMount } from '@vue/test-utils';
import { expect } from 'chai';
import ToggleButton from '@/components/widgets/toggle-button';


describe('toggle-button', () => {
  it('optional label', async () => {
    const tb = shallowMount(ToggleButton, {
      propsData: {
        label: 'toggle button test'
      }
    });
    expect(tb.findAll('.title').length).to.equal(1);
    const title = tb.findAll('.title').at(0);
    expect(title.text()).to.equal('toggle button test');

    await tb.setProps({ label: '' });
    expect(tb.findAll('.title').length).to.equal(0);
  });

  it('default state false', () => {
    const tb = shallowMount(ToggleButton, {
      propsData: {
        value: false
      }
    });
    tb.find('input').trigger('click');
    const emitted = tb.emitted().change;
    expect(emitted[0][0]).to.deep.equal(true);
  });


  it('default state true', () => {
    const tb = shallowMount(ToggleButton, {});
    expect(tb.findAll('.title').length).to.equal(0);
    tb.find('input').trigger('click');
    const emitted = tb.emitted().change;
    expect(emitted[0][0]).to.deep.equal(false);
  });
});

