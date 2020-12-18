import { shallowMount } from '@vue/test-utils';
import { expect } from 'chai';
import TextDisplay from '@/components/widgets/text-display';

const TEXT = 'The quick fox jumps over the lazy cow';

describe('text-display', () => {
  it('untruncated text', () => {
    const c = shallowMount(TextDisplay, {
      propsData: {
        text: TEXT,
        max: 99
      }
    });
    expect(c.find('span').text()).to.equal(TEXT);
  });

  it('truncated text', () => {
    const c = shallowMount(TextDisplay, {
      propsData: {
        text: TEXT,
        max: 10
      }
    });
    expect(c.find('span').text()).to.equal('The quick ...');
  });
});
