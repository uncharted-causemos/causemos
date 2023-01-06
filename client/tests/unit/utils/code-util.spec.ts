import { expect } from 'chai';
import CodeUtil from '@/utils/code-util';

describe('code-util', () => {
  const entries = Object.values(CodeUtil.CODE_TABLE);

  it('meets minimal requirement', () => {
    entries.forEach((entry) => {
      expect({}.hasOwnProperty.call(entry, 'field')).to.equal(true);

      if (entry.searchable) {
        expect({}.hasOwnProperty.call(entry, 'searchDisplay')).to.equal(true);
        expect({}.hasOwnProperty.call(entry, 'ranged')).to.equal(true);
      }
    });
  });

  it('field should be unique', () => {
    const dupeCounter: { [key: string]: number } = {};
    entries.forEach((entry) => {
      // Should not duplicate
      const isDuped = {}.hasOwnProperty.call(dupeCounter, entry.field);
      expect(isDuped).to.equal(false);
      dupeCounter[entry.field] = 1;
    });
  });
});
