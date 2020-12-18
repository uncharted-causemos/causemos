import { shallowMount } from '@vue/test-utils';
import { expect } from 'chai';
import TruncateText from '@/components/widgets/truncate-text';

const TEXT = 'A right schedule is a tight schedule. A wrong schedule is a long schedule.';

describe('text-display', () => {
  it('untruncated text', () => {
    const c = shallowMount(TruncateText, {
      propsData: {
        text: TEXT,
        max: 200
      }
    });
    expect(c.find('span').text()).to.equal(TEXT);
  });

  it('truncated text', () => {
    const c = shallowMount(TruncateText, {
      propsData: {
        text: TEXT,
        max: 16
      }
    });
    expect(c.find('span').text()).to.equal('A right schedule...');
  });
});
