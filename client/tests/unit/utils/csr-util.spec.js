import { expect } from 'chai';
import csrUtil from '@/utils/csr-util';

describe('csr-util', () => {
  describe('getSortedOrder', () => {
    it('can handle empty results', () => {
      const output = csrUtil.getSortedOrder([], []);
      expect(output).to.deep.equal([]);
    });
    it('correctly sums and sorts', () => {
      const rows = ['drought', 'rainfall', 'farming', 'flooding', 'rainfall', 'farming'];
      const values = [0.5, 0.1, 0.3, 0.4, 0.2, 0.5];
      const output = csrUtil.getSortedOrder(rows, values);
      expect(output).to.deep.equal(['farming', 'drought', 'flooding', 'rainfall']);
    });
    it('removes duplicate entries', () => {
      const rows = ['rainfall', 'flooding', 'rainfall'];
      const values = [0.9, 0.1, 0.2];
      const output = csrUtil.getSortedOrder(rows, values);
      expect(output).to.deep.equal(['rainfall', 'flooding']);
    });
  });

  describe('resultsToCsrFormat', () => {
    it('can handle empty results', () => {
      const results = {};
      const output = csrUtil.resultsToCsrFormat(results);
      expect(output).to.deep.equal({
        rows: [],
        columns: [],
        value: []
      });
    });
    it('correctly converts a small set of results', () => {
      const results = {
        rainfall: {
          flooding: 0.2
        },
        flooding: {
          death: 0.1
        }
      };
      const output = csrUtil.resultsToCsrFormat(results);
      expect(output).to.deep.equal({
        rows: ['rainfall', 'flooding'],
        columns: ['flooding', 'death'],
        value: [0.2, 0.1]
      });
    });
    it('leaves out entries with a value of 0', () => {
      const results = {
        rainfall: {
          flooding: 0
        },
        flooding: {
          death: 0.1
        }
      };
      const output = csrUtil.resultsToCsrFormat(results);
      expect(output).to.deep.equal({
        rows: ['flooding'],
        columns: ['death'],
        value: [0.1]
      });
    });
  });
});
