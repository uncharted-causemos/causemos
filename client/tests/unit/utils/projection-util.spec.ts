import _ from 'lodash';
import sinon from 'sinon';
import * as fm from '@/utils/forecast';
import { expect } from 'chai';
import {
  getTimestampMillis as getTsM,
  getTimestampMillisFromYear as getTsY,
  getNumberOfMonthsSinceEpoch,
} from '@/utils/date-util';
import { runProjection } from '@/utils/projection-util';
import { TimeseriesPoint } from '@/types/Timeseries';
import { TemporalResolutionOption } from '@/types/Enums';
import { Subset } from '@/types/Common';

const getNumM = (year: number, month: number) => {
  return getNumberOfMonthsSinceEpoch(getTsM(year, month));
};

const montlyTestData: TimeseriesPoint[] = [
  {
    timestamp: getTsM(2022, 0),
    value: 1,
  },
  {
    timestamp: getTsM(2022, 1),
    value: 2,
  },
  {
    timestamp: getTsM(2022, 2),
    value: 3,
  },
  {
    timestamp: getTsM(2022, 3),
    value: 4,
  },
  {
    timestamp: getTsM(2022, 4),
    value: 5,
  },
];

const yearlyTestData = [
  {
    timestamp: getTsY(1981),
    value: 1,
  },
  {
    timestamp: getTsY(1982),
    value: 3,
  },
  {
    timestamp: getTsY(1983),
    value: 2,
  },
  {
    timestamp: getTsY(1984),
    value: 5,
  },
  {
    timestamp: getTsY(1985),
    value: 4,
  },
];
const DEFAULT_TEST_FORECAST_RESULT: fm.ForecastResult<fm.ForecastMethod.Holt> = {
  method: fm.ForecastMethod.Holt,
  forecast: {
    data: [],
    error: 1,
    parameters: {
      alpha: 0.1,
      beta: 0.4,
    },
  },
  backcast: {
    data: [],
    error: 2,
    parameters: {
      alpha: 0.2,
      beta: 0.5,
    },
  },
};
const createTestForecastResult = (partial?: Subset<fm.ForecastResult<fm.ForecastMethod>>) => {
  return _.merge(DEFAULT_TEST_FORECAST_RESULT, partial);
};
describe('projection-util', () => {
  afterEach(() => {
    sinon.restore();
  });
  describe('runProjection', () => {
    it('calls forecast init function with correct data with year resolution', () => {
      const initialize = sinon.stub(fm.default, 'initialize').returns({
        runAuto: () => createTestForecastResult(),
      } as any);

      runProjection(
        yearlyTestData,
        { start: getTsM(1981, 0), end: getTsM(1985, 4) },
        TemporalResolutionOption.Year
      );

      expect(initialize.args[0][0]).to.deep.equal([
        [1981, 1],
        [1982, 3],
        [1983, 2],
        [1984, 5],
        [1985, 4],
      ]);
    });

    it('calls forecast init function with correct data with month resolution', () => {
      const initialize = sinon.stub(fm.default, 'initialize').returns({
        runAuto: () => createTestForecastResult(),
      } as any);

      runProjection(
        montlyTestData,
        { start: getTsM(1981, 0), end: getTsM(2022, 4) },
        TemporalResolutionOption.Month
      );

      expect(initialize.args[0][0]).to.deep.equal([
        [624, 1],
        [625, 2],
        [626, 3],
        [627, 4],
        [628, 5],
      ]);
    });

    describe('calls forecast function with correct # of forecast/backcast steps', () => {
      const createStub = () => {
        return sinon.stub(fm.default, 'initialize').returns({
          runAuto: () => createTestForecastResult(),
        } as any);
      };
      it('case 1: target period larger than temporal coverage of the data', () => {
        const initialize = createStub();
        runProjection(
          yearlyTestData,
          { start: getTsY(1980), end: getTsY(1991) },
          TemporalResolutionOption.Year
        );
        expect(initialize.args[0][1]).to.deep.equal({ backcastSteps: 1, forecastSteps: 6 });
      });

      it('case 2: target period equals to the temporal coverage of the data', () => {
        const initialize = createStub();
        runProjection(
          yearlyTestData,
          { start: getTsY(1981), end: getTsY(1985) },
          TemporalResolutionOption.Year
        );
        expect(initialize.args[0][1]).to.deep.equal({ backcastSteps: 0, forecastSteps: 0 });
      });

      it('case 3: target period within the temporal coverage of the data', () => {
        const initialize = createStub();
        runProjection(
          montlyTestData,
          { start: getTsM(2022, 1), end: getTsM(2022, 3) },
          TemporalResolutionOption.Month
        );
        expect(initialize.args[0][1]).to.deep.equal({ backcastSteps: 0, forecastSteps: 0 });
      });

      it('case 4: distance between two data points greater than 1', () => {
        const initialize = createStub();
        runProjection(
          [
            { timestamp: getTsM(2022, 0), value: 3 },
            { timestamp: getTsM(2022, 3), value: 6 },
            { timestamp: getTsM(2022, 6), value: 12 },
            { timestamp: getTsM(2022, 9), value: 6 },
          ],
          { start: getTsM(2021, 11), end: getTsM(2023, 1) },
          TemporalResolutionOption.Month
        );
        expect(initialize.args[0][1]).to.deep.equal({ backcastSteps: 1, forecastSteps: 2 });
      });
    });

    it('returns correct projection result with linear interpolation', () => {
      const initialize = sinon.stub(fm.default, 'initialize').returns({
        runAuto: () =>
          createTestForecastResult({
            forecast: {
              data: [
                [getNumM(2023, 0), 12],
                [getNumM(2023, 3), 15],
              ],
            },
            backcast: { data: [[getNumM(2021, 9), 0]] },
          }),
      } as any);

      const targetPeriod = { start: getTsM(2021, 11), end: getTsM(2023, 1) };
      const result = runProjection(
        [
          { timestamp: getTsM(2022, 0), value: 3 },
          { timestamp: getTsM(2022, 3), value: 6 },
          { timestamp: getTsM(2022, 6), value: 12 },
          { timestamp: getTsM(2022, 9), value: 6 },
        ],
        targetPeriod,
        TemporalResolutionOption.Month
      );

      expect(initialize.args[0][1]).to.deep.equal({ backcastSteps: 1, forecastSteps: 2 });
      expect(result.projectionData).to.deep.equal([
        { timestamp: getTsM(2021, 11), value: 2, projectionType: 'backcasted' },
        { timestamp: getTsM(2022, 0), value: 3, projectionType: 'historical' }, // input dp
        { timestamp: getTsM(2022, 1), value: 4, projectionType: 'interpolated' },
        { timestamp: getTsM(2022, 2), value: 5, projectionType: 'interpolated' },
        { timestamp: getTsM(2022, 3), value: 6, projectionType: 'historical' }, // input dp
        { timestamp: getTsM(2022, 4), value: 8, projectionType: 'interpolated' },
        { timestamp: getTsM(2022, 5), value: 10, projectionType: 'interpolated' },
        { timestamp: getTsM(2022, 6), value: 12, projectionType: 'historical' }, // input dp
        { timestamp: getTsM(2022, 7), value: 10, projectionType: 'interpolated' },
        { timestamp: getTsM(2022, 8), value: 8, projectionType: 'interpolated' },
        { timestamp: getTsM(2022, 9), value: 6, projectionType: 'historical' }, // input dp
        { timestamp: getTsM(2022, 10), value: 8, projectionType: 'forecasted' },
        { timestamp: getTsM(2022, 11), value: 10, projectionType: 'forecasted' },
        { timestamp: getTsM(2023, 0), value: 12, projectionType: 'forecasted' },
        { timestamp: getTsM(2023, 1), value: 13, projectionType: 'forecasted' },
      ]);
    });

    it('returns correct projection result with yearly data (no interpolation)', () => {
      const initialize = sinon.stub(fm.default, 'initialize').returns({
        runAuto: () =>
          createTestForecastResult({
            forecast: { data: [] },
            backcast: { data: [[1977, 1]] },
          }),
      } as any);

      const targetPeriod = { start: getTsM(1977, 2), end: getTsM(1981, 0) };
      const result = runProjection(
        [
          { timestamp: getTsY(1978), value: 3 },
          { timestamp: getTsY(1979), value: 6 },
          { timestamp: getTsY(1980), value: 12 },
          { timestamp: getTsY(1981), value: 6 },
        ],
        targetPeriod,
        TemporalResolutionOption.Year
      );

      expect(initialize.args[0][1]).to.deep.equal({ backcastSteps: 1, forecastSteps: 0 });
      expect(result.projectionData).to.deep.equal([
        { timestamp: getTsY(1977), value: 1, projectionType: 'backcasted' },
        { timestamp: getTsY(1978), value: 3, projectionType: 'historical' },
        { timestamp: getTsY(1979), value: 6, projectionType: 'historical' },
        { timestamp: getTsY(1980), value: 12, projectionType: 'historical' },
        { timestamp: getTsY(1981), value: 6, projectionType: 'historical' },
      ]);
    });

    it('returns correct projection result when period falls within the temporal coverage of the data', () => {
      sinon.stub(fm.default, 'initialize').returns({
        runAuto: () => createTestForecastResult(),
      } as any);

      const targetPeriod = { start: getTsY(1972), end: getTsY(1975) };
      const result = runProjection(
        [
          { timestamp: getTsY(1970), value: 3 },
          { timestamp: getTsY(1973), value: 6 },
          { timestamp: getTsY(1976), value: 12 },
        ],
        targetPeriod,
        TemporalResolutionOption.Year
      );

      expect(result.projectionData).to.deep.equal([
        { timestamp: getTsY(1972), value: 5, projectionType: 'interpolated' },
        { timestamp: getTsY(1973), value: 6, projectionType: 'historical' },
        { timestamp: getTsY(1974), value: 8, projectionType: 'interpolated' },
        { timestamp: getTsY(1975), value: 10, projectionType: 'interpolated' },
      ]);
    });

    it('should return forecast run metadata as a part of the result', () => {
      sinon.stub(fm.default, 'initialize').returns({
        runAuto: () => createTestForecastResult(),
      } as any);
      const targetPeriod = { start: getTsY(1980), end: getTsY(1982) };
      const result = runProjection(
        [
          { timestamp: getTsY(1980), value: 3 },
          { timestamp: getTsY(1982), value: 6 },
        ],
        targetPeriod,
        TemporalResolutionOption.Year
      );
      expect(result).to.deep.include(DEFAULT_TEST_FORECAST_RESULT);
    });

    it('throws error when none of data point falls within target period', () => {
      sinon.stub(fm.default, 'initialize').returns({
        runAuto: () => createTestForecastResult(),
      } as any);
      const targetPeriod = { start: getTsY(1990), end: getTsY(2000) };
      expect(() => {
        runProjection(
          [
            { timestamp: getTsY(1980), value: 3 },
            { timestamp: getTsY(1982), value: 6 },
          ],
          targetPeriod,
          TemporalResolutionOption.Year
        );
      }).to.throw('Invalid target period');
    });
  });
});
