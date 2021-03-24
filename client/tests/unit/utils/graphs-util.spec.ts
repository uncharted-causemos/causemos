import { expect } from 'chai';
import { hasBackingEvidence } from '@/utils/graphs-util';

describe('graphs-util', () => {
  it('hasBackingEvidence - user set no evidence', () => {
    let edge = null;
    edge = { polarity: 1, same: 0, opposite: 0, unknown: 0 };
    expect(hasBackingEvidence(edge)).to.equal(false);

    edge = { polarity: 1, same: 0, opposite: 10, unknown: 0 };
    expect(hasBackingEvidence(edge)).to.equal(false);
  });

  it('hasBackingEvidence - with evidence', () => {
    let edge = null;
    edge = { polarity: 1, same: 10, opposite: 10, unknown: 0 };
    expect(hasBackingEvidence(edge)).to.equal(true);

    edge = { polarity: 0, same: 0, opposite: 10, unknown: 5 };
    expect(hasBackingEvidence(edge)).to.equal(true);
  });

  it('hasBackingEvidence - unknown polarity cases', () => {
    let edge = null;
    edge = { polarity: 1, same: 0, opposite: 0, unknown: 10 };
    expect(hasBackingEvidence(edge)).to.equal(false);

    edge = { polarity: 0, same: 0, opposite: 0, unknown: 10 };
    expect(hasBackingEvidence(edge)).to.equal(true);
  });
});
