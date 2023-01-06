import { expect } from 'chai';
import ConceptUtil from '@/utils/concept-util';

describe('concept-util', () => {
  const CONCEPT = 'wm/foo/bar/something/food_availability';

  it('concept shortname', () => {
    const v = ConceptUtil.conceptShortName(CONCEPT);
    expect(v).to.equal('food availability');
  });

  it('concept prefix', () => {
    const v = ConceptUtil.conceptPrefix(CONCEPT);
    expect(v).to.equal('wm/foo/bar');
  });

  it('concept suffix', () => {
    const v = ConceptUtil.conceptSuffix(CONCEPT);
    expect(v).to.equal('something/food availability');
  });

  it('concept human readable', () => {
    const set = new Set<string>(['drought', 'livestock', 'price_or_cost', 'agriculture']);
    const r1 = ConceptUtil.conceptHumanName('agriculture_drought', set);
    expect(r1).to.equal('agriculture drought');

    const r2 = ConceptUtil.conceptHumanName('livestock_price_or_cost', set);
    expect(r2).to.equal('livestock price or cost');
  });
});
