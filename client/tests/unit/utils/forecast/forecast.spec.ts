import _ from 'lodash';
import forecast, { ForecastMethod } from '@/utils/forecast';
import { expect } from 'chai';

describe('forecast', () => {
  describe('initialize', () => {
    it('should initialize with default option', () => {
      const data: [number, number][] = [
        [1, 3],
        [2, 4],
        [3, 5],
      ];
      const f = forecast.initialize(data);
      expect(typeof f.runAuto).to.equal('function');
      expect(typeof f.runHolt).to.equal('function');
      expect(typeof f.runHoltWinters).to.equal('function');
    });
  });
  describe('.runHolt', () => {
    it('should run and return results', () => {
      const data: [number, number][] = [
        [1, 3],
        [2, 4],
        [3, 5],
      ];
      const f = forecast.initialize(data, { holt: { iterations: 1 } });
      const result = f.runHolt();
      expect(result.method).to.equal(ForecastMethod.Holt);
      expect(result.forecast).to.deep.equal({
        data: [
          [4, 6],
          [5, 7],
          [6, 8],
          [7, 9],
          [8, 10],
          [9, 11],
          [10, 12],
          [11, 13],
          [12, 14],
          [13, 15],
          [14, 16],
          [15, 17],
        ],
        parameters: { alpha: 0, beta: 0 },
        error: 0,
      });
      expect(result.backcast).to.deep.equal({
        data: [
          [0, 2],
          [-1, 1],
          [-2, 0],
          [-3, -1],
          [-4, -2],
          [-5, -3],
          [-6, -4],
          [-7, -5],
          [-8, -6],
          [-9, -7],
          [-10, -8],
          [-11, -9],
        ],
        parameters: { alpha: 0, beta: 0 },
        error: 0,
      });
    });
  });
  describe('.runHoltWinters', () => {
    it('should run and return results', () => {
      const data: [number, number][] = [
        [1, 1],
        [2, 4],
        [3, 3],
        [4, 2],
        [5, 2],
        [6, 5],
        [7, 4],
        [8, 3],
        [9, 2],
        [10, 6],
        [11, 3],
      ];
      const f = forecast.initialize(data, {
        backcastSteps: 3,
        forecastSteps: 3,
        holtWinters: { iterations: 3 },
      });
      const result = f.runHoltWinters();
      expect(result.method).to.equal(ForecastMethod.HoltWinters);
      expect(result.forecast).to.deep.equal({
        data: [
          [12, 2.69488015404617],
          [13, 1.723746309648957],
          [14, 4.433196178310911],
        ],
        parameters: {
          alpha: 0.3333333333333333,
          beta: 0.6666666666666666,
          gamma: 0.6666666666666666,
          period: 4,
        },
        error: 0.7694798882300284,
      });
      expect(result.backcast).to.deep.equal({
        data: [
          [0, 1.2353242851643984],
          [-1, 1.4417340388354511],
          [-2, 1.5044048255263198],
        ],
        error: 0.4204199965474075,
        parameters: {
          alpha: 0.3333333333333333,
          beta: 0.6666666666666666,
          gamma: 0.3333333333333333,
          period: 4,
        },
      });
    });
    it('should throw an error with not enough data points', () => {
      const data: [number, number][] = [
        [1, 1],
        [2, 4],
        [3, 3],
        [4, 1.5],
        [5, 4.5],
        [6, 3.5],
      ];
      const f = forecast.initialize(data, {
        backcastSteps: 3,
        forecastSteps: 3,
        holtWinters: { iterations: 2 },
      });
      expect(() => f.runHoltWinters()).to.throws(
        'Not enough data to estimate forecasts - need at least 7 data points ( > 2*MIN_PERIOD)'
      );
    });
  });
  describe('.runAuto', () => {
    it('should pick and run Holt', () => {
      const data: [number, number][] = [
        [1, 2],
        [2, 4],
        [3, 6],
        [4, 8],
        [5, 10],
        [6, 12],
        [7, 14],
      ];
      const f = forecast.initialize(data, {
        backcastSteps: 3,
        forecastSteps: 3,
        holtWinters: { iterations: 2 },
      });
      const result = f.runAuto();
      expect(result.method).to.equal(ForecastMethod.Holt);
    });
    it('should pick and run Holt-Winters with seasonal data', () => {
      const data: [number, number][] = [
        [1, 1],
        [2, 4],
        [3, 3],
        [4, 1.5],
        [5, 4.5],
        [6, 3.5],
        [7, 2],
      ];
      const f = forecast.initialize(data, {
        backcastSteps: 3,
        forecastSteps: 3,
        holtWinters: { iterations: 2 },
      });
      const result = f.runAuto();
      expect(result.method).to.equal(ForecastMethod.HoltWinters);
    });
    it('should pick and run Holt when there are not enough data points', () => {
      const data: [number, number][] = [
        [1, 1],
        [2, 4],
        [3, 3],
        [4, 1.5],
        [5, 4.5],
        [6, 3.5],
      ];
      const f = forecast.initialize(data, {
        backcastSteps: 3,
        forecastSteps: 3,
        holtWinters: { iterations: 2 },
      });
      const result = f.runAuto();
      expect(result.method).to.equal(ForecastMethod.Holt);
    });
  });
});
