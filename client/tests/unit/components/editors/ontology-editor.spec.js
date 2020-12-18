import { shallowMount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import { expect } from 'chai';
import OntologyEditor from '@/components/editors/ontology-editor';

const localVue = createLocalVue();
localVue.use(Vuex);

describe('ontology-editor', () => {
  let store;

  const componentProperties = {
    concept: 'dummy',
    suggestions: [
      { name: 'abc', score: 0.77 },
      { name: 'def', score: 0.87 },
      { name: 'xyz', score: 0.97 }
    ]
  };

  beforeEach(() => {
    store = new Vuex.Store({
      namespaced: true,
      modules: {
        app: {
          namespaced: true,
          getters: {
            ontologyConcepts: () => ['a', 'b', 'c']
          }
        }
      }
    });
  });


  it('render suggestions', () => {
    const editor = shallowMount(OntologyEditor, {
      propsData: componentProperties,
      store,
      localVue
    });
    expect(editor.findAll('.dropdown-option').length).to.equal(componentProperties.suggestions.length);
  });

  it('emitting selected ontology item', () => {
    const editor = shallowMount(OntologyEditor, {
      propsData: componentProperties,
      store,
      localVue
    });
    const item2 = editor.findAll('.dropdown-option').at(1);
    item2.trigger('click');

    const emitted = editor.emitted().select;
    expect(emitted[0][0]).to.deep.equal(componentProperties.suggestions[1].name);
  });
});
