import { shallowMount } from '@vue/test-utils';
import { expect } from 'chai';
import CollapsibleItem from '@/components/drilldown-panel/collapsible-item';

describe('collapsible-item', () => {
  it('collapsible-item renders', () => {
    const ci = shallowMount(CollapsibleItem);

    expect(ci.find('.item-title').exists()).to.equal(true);
    expect(ci.find('.dummy-content').exists()).to.equal(false);
  });


  it('collapsible-item slots', async () => {
    const ci = shallowMount(CollapsibleItem, {
      slots: {
        title: '<p class="dummy-title">dummy title</p>',
        content: '<p class="dummy-content">dummy content</p>'
      }
    });
    expect(ci.find('.item-title').exists()).to.equal(true);
    expect(ci.find('.dummy-title').exists()).to.equal(true);

    // Not expanded yet so not available
    expect(ci.find('.dummy-content').exists()).to.equal(false);

    await ci.setData({ expanded: true });

    // Should be expanded now
    expect(ci.find('.dummy-content').exists()).to.equal(true);
  });
});

