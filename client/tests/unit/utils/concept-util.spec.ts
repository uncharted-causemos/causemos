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
});
