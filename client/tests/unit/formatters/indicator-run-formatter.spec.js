/* eslint-disable no-unused-expressions */

import indicatorRunFormatter from '@/formatters/indicator-run-formatter';

describe('indicator-run-formatter', () => {
  it('correctly handles empty input objects', () => {
    const input = { parameters: {} };
    expect(indicatorRunFormatter(input)).to.equal('');
  });
  it('correctly handles one parameter', () => {
    const input = {
      parameters: {
        basin: {
          name: 'basin',
          value: 'Guder',
        },
      },
    };
    expect(indicatorRunFormatter(input)).to.equal('basin: Guder');
  });
  it('correctly handles multiple parameters and inserts commas', () => {
    const input = {
      parameters: {
        basin: {
          name: 'basin',
          value: 'Guder',
        },
        evotranspiration: {
          name: 'evotranspiration',
          value: '1.0',
        },
      },
    };
    expect(indicatorRunFormatter(input)).to.equal('basin: Guder, evotranspiration: 1.0');
  });
  it('removes underscores from parameter names', () => {
    const input = {
      parameters: {
        additional_extension: {
          name: 'additional_extension',
          value: '0.0',
        },
      },
    };
    expect(indicatorRunFormatter(input)).to.equal('additional extension: 0.0');
  });
});
