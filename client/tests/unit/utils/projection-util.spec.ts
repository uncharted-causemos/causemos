import _ from 'lodash';
import sinon from 'sinon';
import * as fm from '@/utils/forecast';
import { expect } from 'chai';
import {
  getTimestampMillis as getTsM,
  getTimestampMillisFromYear as getTsY,
  getNumberOfMonthsSinceEpoch,
} from '@/utils/date-util';
import { runProjection, createProjectionRunner } from '@/utils/projection-util';
import { TimeseriesPoint } from '@/types/Timeseries';
import { TemporalResolutionOption, AggregationOption, ProjectionAlgorithm } from '@/types/Enums';
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
  reason: fm.ForecastMethodSelectionReason.MinimalError,
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
  return _.merge({}, DEFAULT_TEST_FORECAST_RESULT, partial);
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

      it('case 5: target period does not overlap with data coverage', () => {
        const initialize = createStub();
        const targetPeriod = { start: getTsY(1980), end: getTsY(1982) };
        runProjection(
          [
            { timestamp: getTsY(1984), value: 3 },
            { timestamp: getTsY(1985), value: 6 },
          ],
          targetPeriod,
          TemporalResolutionOption.Year
        );
        expect(initialize.args[0][1]).to.deep.equal({ backcastSteps: 4, forecastSteps: 0 });
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

    it('should still return projection data when start date of target period > last date of the input data', () => {
      sinon.stub(fm.default, 'initialize').returns({
        runAuto: () =>
          createTestForecastResult({
            forecast: {
              data: [
                [1984, 1],
                [1985, 2],
                [1986, 3],
                [1987, 4],
              ],
            },
            backcast: { data: [] },
          }),
      } as any);
      const targetPeriod = { start: getTsY(1985), end: getTsY(1987) };
      const result = runProjection(
        [
          { timestamp: getTsY(1982), value: 3 },
          { timestamp: getTsY(1983), value: 6 },
        ],
        targetPeriod,
        TemporalResolutionOption.Year
      );
      expect(result.projectionData).to.deep.equal([
        { timestamp: getTsY(1985), value: 2, projectionType: 'forecasted' },
        { timestamp: getTsY(1986), value: 3, projectionType: 'forecasted' },
        { timestamp: getTsY(1987), value: 4, projectionType: 'forecasted' },
      ]);
    });
    it('should run projection with provided projection algorithm', () => {
      sinon.stub(fm.default, 'initialize').returns({
        runHoltWinters: () =>
          createTestForecastResult({
            method: fm.ForecastMethod.HoltWinters,
          }),

        runHolt: () =>
          createTestForecastResult({
            method: fm.ForecastMethod.Holt,
          }),
      } as any);
      const targetPeriod = { start: getTsY(1985), end: getTsY(1987) };
      const result = runProjection(
        [
          { timestamp: getTsY(1982), value: 3 },
          { timestamp: getTsY(1983), value: 6 },
        ],
        targetPeriod,
        TemporalResolutionOption.Year,
        ProjectionAlgorithm.Holt
      );
      expect(result.method).to.equal(fm.ForecastMethod.Holt);

      const resultHW = runProjection(
        [
          { timestamp: getTsY(1982), value: 3 },
          { timestamp: getTsY(1983), value: 6 },
        ],
        targetPeriod,
        TemporalResolutionOption.Year,
        ProjectionAlgorithm.HoltWinters
      );
      expect(resultHW.method).to.equal(fm.ForecastMethod.HoltWinters);
    });
  });
  describe('createProjectionRunner', () => {
    const testTree = {
      id: 'output-node',
      name: 'Overall Priority',
      isOutputNode: true,
      components: [
        {
          componentNode: {
            id: '5ad78cb0-b923-48ef-9c1a-31219987ca16',
            name: 'Highest risk of drought',
            isOutputNode: false,
            components: [
              {
                isOppositePolarity: false,
                isWeightUserSpecified: false,
                weight: 0,
                componentNode: {
                  id: 'a547b59f-9287-4991-a817-08ba54a0353f',
                  name: 'Greatest reliance on fragile crops',
                  isOutputNode: false,
                  components: [],
                },
              },
            ],
          },
          isOppositePolarity: false,
          isWeightUserSpecified: true,
          weight: 50,
        },
        {
          componentNode: {
            id: 'weighted-sum-node-2',
            name: 'Largest vulnerable population',
            isOutputNode: false,
            components: [
              {
                isOppositePolarity: false,
                isWeightUserSpecified: true,
                weight: 40,
                componentNode: {
                  id: 'data-node-1',
                  name: 'Highest poverty index ranking',
                  isOutputNode: false,
                  dataset: {
                    datasetName: 'Poverty indicator index',
                    config: {
                      datasetId: 'b935f602-30b2-48bc-bdc8-10351bbffa67',
                      selectedTimestamp: 0,
                      outputVariable: 'test',
                      runId: 'indicators',
                      temporalResolution: TemporalResolutionOption.Month,
                      temporalAggregation: AggregationOption.Mean,
                      spatialAggregation: AggregationOption.Mean,
                    },
                    isInverted: false,
                    projectionAlgorithm: ProjectionAlgorithm.Auto,
                    source: 'UN',
                  },
                },
              },
              {
                isOppositePolarity: false,
                isWeightUserSpecified: true,
                weight: 60,
                componentNode: {
                  id: 'weighted-sum-node-1',
                  name: 'Population Health',
                  isOutputNode: false,
                  components: [
                    {
                      isOppositePolarity: true,
                      isWeightUserSpecified: true,
                      weight: 50,
                      componentNode: {
                        id: 'data-node-2',
                        name: 'Malnutrition',
                        isOutputNode: false,
                        dataset: {
                          datasetName: 'Malnutrition rates dataset',
                          source: 'UN',
                          isInverted: false,
                          projectionAlgorithm: ProjectionAlgorithm.Auto,
                          config: {
                            datasetId: '45bbec86-221a-4936-ae41-a85e4d7088cb',
                            selectedTimestamp: 0,
                            outputVariable: 'test',
                            runId: 'indicators',
                            temporalResolution: TemporalResolutionOption.Month,
                            temporalAggregation: AggregationOption.Mean,
                            spatialAggregation: AggregationOption.Mean,
                          },
                        },
                      },
                    },
                    {
                      isOppositePolarity: false,
                      isWeightUserSpecified: true,
                      weight: 50,
                      componentNode: {
                        id: 'data-node-3',
                        name: 'Life expectancy by country',
                        isOutputNode: false,
                        dataset: {
                          datasetName: 'Life expectancy by country',
                          source: 'UN',
                          isInverted: true,
                          projectionAlgorithm: ProjectionAlgorithm.Auto,
                          config: {
                            datasetId: '56773014-bc09-4bd8-a328-9c61923078e0',
                            selectedTimestamp: 0,
                            outputVariable: 'test',
                            runId: 'indicators',
                            temporalResolution: TemporalResolutionOption.Month,
                            temporalAggregation: AggregationOption.Mean,
                            spatialAggregation: AggregationOption.Mean,
                          },
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
          isOppositePolarity: false,
          isWeightUserSpecified: true,
          weight: 50,
        },
      ],
    };
    const testTargetPeriod = { start: getTsM(1980, 0), end: getTsM(1980, 6) };
    const testHistoricalData = {
      'data-node-1': [
        { timestamp: getTsM(1980, 2), value: 0.2 },
        { timestamp: getTsM(1980, 4), value: 0.4 },
      ],
      'data-node-2': [
        { timestamp: getTsM(1980, 0), value: 0.4 },
        { timestamp: getTsM(1980, 1), value: 0.6 },
        { timestamp: getTsM(1980, 2), value: 0.4 },
        { timestamp: getTsM(1980, 3), value: 0.6 },
        { timestamp: getTsM(1980, 4), value: 0.4 },
        { timestamp: getTsM(1980, 5), value: 0.6 },
        { timestamp: getTsM(1980, 6), value: 0.4 },
      ],
      'data-node-3': [
        { timestamp: getTsM(1980, 0), value: 1 },
        { timestamp: getTsM(1980, 2), value: 0.6 },
        { timestamp: getTsM(1980, 4), value: 0.2 },
        { timestamp: getTsM(1980, 6), value: 0 },
      ],
    };
    beforeEach(() => {
      // set up fake forecast function that returns backcast and foreacast results only with
      // first input data ('data-node-1')
      sinon.replace(fm.default, 'initialize', (data: [number, number][]) => {
        const runAutoResult =
          data.length === 2
            ? createTestForecastResult({
                backcast: { data: [[getNumM(1980, 0), 0]] },
                forecast: { data: [[getNumM(1980, 6), 0.6]] },
              })
            : createTestForecastResult();
        return {
          runAuto() {
            return runAutoResult;
          },
        } as any;
      });
    });
    it('should create a new projection runner', () => {
      const runner = createProjectionRunner(
        testTree,
        testHistoricalData,
        testTargetPeriod,
        TemporalResolutionOption.Month
      );

      expect(runner.getProjectionResultForDatasetNodes()).to.deep.equal({});
      expect(runner.getProjectionResultForWeightedSumNodes()).to.deep.equal({});
      expect(runner.getResults()).to.deep.equal({});
      expect(runner.getRunInfo()).to.deep.equal({});
    });
    it('should run projection for all dataset nodes', () => {
      const runner = createProjectionRunner(
        testTree,
        testHistoricalData,
        testTargetPeriod,
        TemporalResolutionOption.Month
      ).projectAllDatasetNodes();

      const expected = {
        'data-node-1': [
          { timestamp: getTsM(1980, 0), value: 0, projectionType: 'backcasted' },
          { timestamp: getTsM(1980, 1), value: 0.1, projectionType: 'backcasted' },
          { timestamp: getTsM(1980, 2), value: 0.2, projectionType: 'historical' },
          {
            timestamp: getTsM(1980, 3),
            value: 0.30000000000000004,
            projectionType: 'interpolated',
          },
          { timestamp: getTsM(1980, 4), value: 0.4, projectionType: 'historical' },
          { timestamp: getTsM(1980, 5), value: 0.5, projectionType: 'forecasted' },
          { timestamp: getTsM(1980, 6), value: 0.6, projectionType: 'forecasted' },
        ],
        'data-node-2': [
          { timestamp: getTsM(1980, 0), value: 0.4, projectionType: 'historical' },
          { timestamp: getTsM(1980, 1), value: 0.6, projectionType: 'historical' },
          { timestamp: getTsM(1980, 2), value: 0.4, projectionType: 'historical' },
          { timestamp: getTsM(1980, 3), value: 0.6, projectionType: 'historical' },
          { timestamp: getTsM(1980, 4), value: 0.4, projectionType: 'historical' },
          { timestamp: getTsM(1980, 5), value: 0.6, projectionType: 'historical' },
          { timestamp: getTsM(1980, 6), value: 0.4, projectionType: 'historical' },
        ],
        'data-node-3': [
          { timestamp: getTsM(1980, 0), value: 1, projectionType: 'historical' },
          { timestamp: getTsM(1980, 1), value: 0.8, projectionType: 'interpolated' },
          { timestamp: getTsM(1980, 2), value: 0.6, projectionType: 'historical' },
          { timestamp: getTsM(1980, 3), value: 0.4, projectionType: 'interpolated' },
          { timestamp: getTsM(1980, 4), value: 0.2, projectionType: 'historical' },
          { timestamp: getTsM(1980, 5), value: 0.1, projectionType: 'interpolated' },
          { timestamp: getTsM(1980, 6), value: 0, projectionType: 'historical' },
        ],
      };

      expect(runner.getProjectionResultForDatasetNodes()).to.deep.equal(expected);
      expect(runner.getProjectionResultForWeightedSumNodes()).to.deep.equal({});
      expect(runner.getResults()).to.deep.equal(expected);
      expect(runner.getRunInfo()).to.deep.equal({
        'data-node-1': {
          method: 'Holt',
          reason: 'MinimalError',
          forecast: {
            data: [[126, 0.6]],
            error: 1,
            parameters: {
              alpha: 0.1,
              beta: 0.4,
            },
          },
          backcast: {
            data: [[120, 0]],
            error: 2,
            parameters: {
              alpha: 0.2,
              beta: 0.5,
            },
          },
        },
        'data-node-2': DEFAULT_TEST_FORECAST_RESULT,
        'data-node-3': DEFAULT_TEST_FORECAST_RESULT,
      });
    });
    it('should calculate weighted sum of its children for each weighted sum node in the tree', () => {
      // Tree structure with weights
      // root = 50% of 40% of data-node-1
      //                +
      //               60% of 50% of data-node-2 (opposite polarity)
      //                       +
      //                      50% of data-node-3 (inverted)
      const runner = createProjectionRunner(
        testTree,
        testHistoricalData,
        testTargetPeriod,
        TemporalResolutionOption.Month
      )
        .projectAllDatasetNodes()
        .calculateWeightedSum();
      const expected = {
        // 50% of opposite 'data-node-2'
        // [0.3, 0.2, 0.3, 0.2, 0.3, 0.2,  0.3]
        // +
        // 50% of inverted 'data-node-3'
        // [0,   0.1, 0.2, 0.3, 0.4, 0.45, 0.5]
        'weighted-sum-node-1': [
          { timestamp: getTsM(1980, 0), value: 0.3, projectionType: 'historical' },
          { timestamp: getTsM(1980, 1), value: 0.3, projectionType: 'interpolated' },
          { timestamp: getTsM(1980, 2), value: 0.5, projectionType: 'historical' },
          { timestamp: getTsM(1980, 3), value: 0.5, projectionType: 'interpolated' },
          { timestamp: getTsM(1980, 4), value: 0.7, projectionType: 'historical' },
          { timestamp: getTsM(1980, 5), value: 0.65, projectionType: 'interpolated' },
          { timestamp: getTsM(1980, 6), value: 0.8, projectionType: 'historical' },
        ],
        // 60 % of 'weighted-sum-node-1'
        // [0.18, 0.18, 0.3, 0.3, 0.42, 0.39, 0.48]
        // +
        // 40 % of 'data-node-1'
        // [0, 0.04, 0.08, 0.12, 0.16, 0.20, 0.24]
        'weighted-sum-node-2': [
          { timestamp: getTsM(1980, 0), value: 0.18, projectionType: 'interpolated' },
          { timestamp: getTsM(1980, 1), value: 0.22, projectionType: 'interpolated' },
          { timestamp: getTsM(1980, 2), value: 0.38, projectionType: 'historical' },
          { timestamp: getTsM(1980, 3), value: 0.42, projectionType: 'interpolated' },
          { timestamp: getTsM(1980, 4), value: 0.58, projectionType: 'historical' },
          { timestamp: getTsM(1980, 5), value: 0.59, projectionType: 'interpolated' },
          { timestamp: getTsM(1980, 6), value: 0.72, projectionType: 'interpolated' },
        ],
        // 50% of 'weighted-sum-node-2'
        'output-node': [
          { timestamp: getTsM(1980, 0), value: 0.09, projectionType: 'interpolated' },
          { timestamp: getTsM(1980, 1), value: 0.11, projectionType: 'interpolated' },
          { timestamp: getTsM(1980, 2), value: 0.19, projectionType: 'historical' },
          { timestamp: getTsM(1980, 3), value: 0.21, projectionType: 'interpolated' },
          { timestamp: getTsM(1980, 4), value: 0.29, projectionType: 'historical' },
          { timestamp: getTsM(1980, 5), value: 0.3, projectionType: 'interpolated' },
          { timestamp: getTsM(1980, 6), value: 0.36, projectionType: 'interpolated' },
        ],
      };
      const result = runner.getProjectionResultForWeightedSumNodes();
      // round up numbers for easy comparison
      for (const [_, series] of Object.entries(result)) {
        series.forEach((v) => (v.value = +v.value.toFixed(2)));
      }

      expect(runner.getProjectionResultForWeightedSumNodes()).to.deep.equal(expected);
      expect(runner.getResults()).to.deep.include(expected);
    });
    it('should run projection fine with missing historical data', () => {
      // remove data-node-1
      const historicalData: any = _.cloneDeep(testHistoricalData);
      historicalData['data-node-1'] = undefined;
      const result = createProjectionRunner(
        testTree,
        historicalData,
        testTargetPeriod,
        TemporalResolutionOption.Month
      )
        .runProjection()
        .getResults();
      expect(result).to.deep.equal({
        'data-node-2': [
          { timestamp: getTsM(1980, 0), value: 0.4, projectionType: 'historical' },
          { timestamp: getTsM(1980, 1), value: 0.6, projectionType: 'historical' },
          { timestamp: getTsM(1980, 2), value: 0.4, projectionType: 'historical' },
          { timestamp: getTsM(1980, 3), value: 0.6, projectionType: 'historical' },
          { timestamp: getTsM(1980, 4), value: 0.4, projectionType: 'historical' },
          { timestamp: getTsM(1980, 5), value: 0.6, projectionType: 'historical' },
          { timestamp: getTsM(1980, 6), value: 0.4, projectionType: 'historical' },
        ],
        'data-node-3': [
          { timestamp: getTsM(1980, 0), value: 1, projectionType: 'historical' },
          { timestamp: getTsM(1980, 1), value: 0.8, projectionType: 'interpolated' },
          { timestamp: getTsM(1980, 2), value: 0.6, projectionType: 'historical' },
          { timestamp: getTsM(1980, 3), value: 0.4, projectionType: 'interpolated' },
          { timestamp: getTsM(1980, 4), value: 0.2, projectionType: 'historical' },
          { timestamp: getTsM(1980, 5), value: 0.1, projectionType: 'interpolated' },
          { timestamp: getTsM(1980, 6), value: 0, projectionType: 'historical' },
        ],
        // 50% of opposite 'data-node-2'
        // [0.3, 0.2, 0.3, 0.2, 0.3, 0.2,  0.3]
        // +
        // 50% of inverted 'data-node-3'
        // [0,   0.1, 0.2, 0.3, 0.4, 0.45, 0.5]
        'weighted-sum-node-1': [
          { timestamp: getTsM(1980, 0), value: 0.3, projectionType: 'historical' },
          { timestamp: getTsM(1980, 1), value: 0.3, projectionType: 'interpolated' },
          { timestamp: getTsM(1980, 2), value: 0.5, projectionType: 'historical' },
          { timestamp: getTsM(1980, 3), value: 0.5, projectionType: 'interpolated' },
          { timestamp: getTsM(1980, 4), value: 0.7, projectionType: 'historical' },
          { timestamp: getTsM(1980, 5), value: 0.65, projectionType: 'interpolated' },
          { timestamp: getTsM(1980, 6), value: 0.8, projectionType: 'historical' },
        ],
        // 60 % of 'weighted-sum-node-1'
        'weighted-sum-node-2': [
          { timestamp: getTsM(1980, 0), value: 0.18, projectionType: 'historical' },
          { timestamp: getTsM(1980, 1), value: 0.18, projectionType: 'interpolated' },
          { timestamp: getTsM(1980, 2), value: 0.3, projectionType: 'historical' },
          { timestamp: getTsM(1980, 3), value: 0.3, projectionType: 'interpolated' },
          { timestamp: getTsM(1980, 4), value: 0.42, projectionType: 'historical' },
          { timestamp: getTsM(1980, 5), value: 0.39, projectionType: 'interpolated' },
          { timestamp: getTsM(1980, 6), value: 0.48, projectionType: 'historical' },
        ],
        // 50% of 'weighted-sum-node-2'
        'output-node': [
          { timestamp: getTsM(1980, 0), value: 0.09, projectionType: 'historical' },
          { timestamp: getTsM(1980, 1), value: 0.09, projectionType: 'interpolated' },
          { timestamp: getTsM(1980, 2), value: 0.15, projectionType: 'historical' },
          { timestamp: getTsM(1980, 3), value: 0.15, projectionType: 'interpolated' },
          { timestamp: getTsM(1980, 4), value: 0.21, projectionType: 'historical' },
          { timestamp: getTsM(1980, 5), value: 0.195, projectionType: 'interpolated' },
          { timestamp: getTsM(1980, 6), value: 0.24, projectionType: 'historical' },
        ],
      });
    });
    it('should return projection run information for each node', () => {
      const runInfo = createProjectionRunner(
        testTree,
        testHistoricalData,
        testTargetPeriod,
        TemporalResolutionOption.Month
      )
        .runProjection()
        .getRunInfo();

      expect(runInfo).to.deep.equal({
        'data-node-1': {
          method: 'Holt',
          reason: 'MinimalError',
          forecast: {
            data: [[126, 0.6]],
            error: 1,
            parameters: {
              alpha: 0.1,
              beta: 0.4,
            },
          },
          backcast: {
            data: [[120, 0]],
            error: 2,
            parameters: {
              alpha: 0.2,
              beta: 0.5,
            },
          },
        },
        'data-node-2': DEFAULT_TEST_FORECAST_RESULT,
        'data-node-3': DEFAULT_TEST_FORECAST_RESULT,
        'weighted-sum-node-1': {
          method: 'Weighted Sum',
        },
        'weighted-sum-node-2': {
          method: 'Weighted Sum',
        },
        'output-node': {
          method: 'Weighted Sum',
        },
      });
    });
    it('should run projection with single node with provided projection algorithm', () => {
      // stub runHolt and runHoltWinters functions
      sinon.restore();
      sinon.replace(fm.default, 'initialize', () => {
        return {
          runAuto: () => {},
          runHolt: () => createTestForecastResult({ method: fm.ForecastMethod.Holt }),
          runHoltWinters: () => createTestForecastResult({ method: fm.ForecastMethod.HoltWinters }),
        } as any;
      });

      const runner = createProjectionRunner(
        testTree,
        testHistoricalData,
        testTargetPeriod,
        TemporalResolutionOption.Month
      );
      const infoH = runner
        .projectDatasetNode('data-node-1', { method: ProjectionAlgorithm.Holt })
        .getRunInfo();

      expect(infoH['data-node-1'].method).to.equal(fm.ForecastMethod.Holt);

      const infoHW = runner
        .projectDatasetNode('data-node-1', { method: ProjectionAlgorithm.HoltWinters })
        .getRunInfo();

      expect(infoHW['data-node-1'].method).to.equal(fm.ForecastMethod.HoltWinters);
    });
  });
});
