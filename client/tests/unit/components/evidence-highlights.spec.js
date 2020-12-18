import { shallowMount } from '@vue/test-utils';
import { expect } from 'chai';
import EvidenceHighlights from '@/components/evidence-highlights';

describe('evidence-highlights', () => {
  it('evidence-highlights agents_text and hedging_words using same strings', () => {
    const ci = shallowMount(EvidenceHighlights, {
      propsData: {
        evidence: {
          evidence_context: {
            text: 'These scenarios are not necessarily exclusive , because there may be a gradual transition between them over time .',
            negation_words: [],
            hedging_words: ['may'],
            agents_text: ['there may be a gradual transition between them over time', 'scenarios']
          }
        }
      }
    });
    expect(ci.findAll('.highlight').length).to.equal(3);
  });

  it('evidence-highlights agents_text and negation_words using same strings', () => {
    const ci = shallowMount(EvidenceHighlights, {
      propsData: {
        evidence: {
          evidence_context: {
            text: 'These scenarios are not necessarily exclusive , because there may be not a gradual transition between them over time .',
            negation_words: ['not'],
            hedging_words: [],
            agents_text: ['there may be not a gradual transition between them over time', 'scenarios']
          }
        }
      }
    });
    expect(ci.findAll('.highlight').length).to.equal(3);
  });

  it('evidence-highlights agents_text, hedging_words, and negation_words using same strings', () => {
    const ci = shallowMount(EvidenceHighlights, {
      propsData: {
        evidence: {
          evidence_context: {
            text: 'These scenarios are not necessarily exclusive , because there may be a gradual transition between them over time .',
            negation_words: ['not'],
            hedging_words: ['may', 'not'],
            agents_text: ['there may be a gradual transition between them over time', 'scenarios']
          }
        }
      }
    });
    expect(ci.findAll('.highlight').length).to.equal(5);
  });
});
