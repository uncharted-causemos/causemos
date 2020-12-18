import { shallowMount } from '@vue/test-utils';
import { expect } from 'chai';
import Overlay from '@/components/overlay';

describe('overlay', () => {
  it('overlay default', () => {
    const ci = shallowMount(Overlay, {});
    expect(ci.find('.message-container').text()).to.equal('Loading...');
  });

  it('overlay custom', () => {
    const ci = shallowMount(Overlay, {});
    expect(ci.find('.message-container').text()).to.equal('Loading...');

    const msg = 'hello world';
    ci.setProps({ message: msg });
    expect(ci.find('.message-container').text()).to.equal(msg);
  });
});

