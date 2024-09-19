import { getParentRegion, isAncestorOfRegion } from '@/utils/admin-level-util';

describe('admin-level-util', () => {
  describe('getParentRegion', () => {
    it('should return an empty string when passed an empty string', () => {
      expect(getParentRegion('')).to.equal('');
    });
    it('should return an empty string when passed a country', () => {
      expect(getParentRegion('Canada')).to.equal('');
    });
    it('should return the parent country when passed an L1 level region ID', () => {
      expect(getParentRegion('Canada__Ontario')).to.equal('Canada');
    });
    it('should return the parent L1 region when passed an L2 level region ID', () => {
      expect(getParentRegion('Canada__Ontario__Toronto')).to.equal('Canada__Ontario');
    });
  });
  describe('isAncestorOfRegion', () => {
    it('should return true when the ancestor is an empty string', () => {
      expect(isAncestorOfRegion('', 'Canada__Ontario')).to.equal(true);
    });
    it('should return false when the child is an empty string', () => {
      expect(isAncestorOfRegion('Canada', '')).to.equal(false);
    });
  });
});
