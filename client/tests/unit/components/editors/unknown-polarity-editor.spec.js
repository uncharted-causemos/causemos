import { shallowMount } from '@vue/test-utils';
import { expect } from 'chai';
import UnknownPolarityEditor from '@/components/editors/unknown-polarity-editor';

describe('unknown-polarity-editor', () => {
  it('render editor options', () => {
    const editor = shallowMount(UnknownPolarityEditor, {});
    expect(editor.findAll('.dropdown-option').length).to.equal(2);
  });
});
