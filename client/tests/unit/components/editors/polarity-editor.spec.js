import { shallowMount, mount } from '@vue/test-utils';
import { expect } from 'chai';
import PolarityEditor from '@/components/editors/polarity-editor';

/**
 * Polarity editor test
 */
describe('polarity-editor', () => {
  it('render polarity options', () => {
    const editor = shallowMount(PolarityEditor, {});
    expect(editor.findAll('.dropdown-option').length).to.equal(4);
  });

  it('emitting selected polarity item', () => {
    let emitted = null;
    const editor = shallowMount(PolarityEditor, {});
    const options = editor.findAll('.dropdown-option');

    options.at(2).trigger('click');
    emitted = editor.emitted().select;
    expect(emitted[0][0]).to.deep.equal({ subjPolarity: 1, objPolarity: -1 });

    options.at(1).trigger('click');
    emitted = editor.emitted().select;
    expect(emitted[1][0]).to.deep.equal({ subjPolarity: -1, objPolarity: -1 });
  });

  it('emitting close', () => {
    let emitted = null;
    const editor = mount(PolarityEditor, {});
    const close = editor.find('.close-button');
    close.trigger('click');
    emitted = editor.emitted();
    const keys = Object.keys(emitted);
    expect(keys.length).to.equal(1);
    expect(keys[0]).to.equal('close');
  });
});
