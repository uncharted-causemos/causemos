import { shallowMount } from '@vue/test-utils';
import { expect } from 'chai';
import HighlightText from '@/components/widgets/highlight-text';

describe('highlight-text', () => {
  it('highlight-text keyword found', () => {
    const ci = shallowMount(HighlightText, {
      propsData: {
        text: 'The quick brown fox jumps over the lazy cow',
        highlights: ['quick']
      }
    });
    expect(ci.find('.highlight').exists()).to.equal(true);
  });

  it('highlight-text keyword not found', () => {
    const ci = shallowMount(HighlightText, {
      propsData: {
        text: 'The quick brown fox jumps over the lazy cow',
        highlights: ['grapes']
      }
    });
    expect(ci.find('.highlight').exists()).to.equal(false);
  });

  it('highlight-text multi keywords (case insensitive)', () => {
    const ci = shallowMount(HighlightText, {
      propsData: {
        text: 'The quick brown fox jumps over the lazy cow',
        highlights: ['quick', 'over', 'The']
      }
    });
    expect(ci.findAll('.highlight').length).to.equal(4);
  });

  it('highlight-text multi keywords (partial matches)', () => {
    const ci = shallowMount(HighlightText, {
      propsData: {
        text: 'The quick brown fox jumps over the lazy cow',
        highlights: ['quick', 'over', 'foobar']
      }
    });
    expect(ci.findAll('.highlight').length).to.equal(2);
  });
});

