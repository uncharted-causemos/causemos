import { expect } from 'chai';
import { correctIncompleteTimeseries } from '@/utils/incomplete-data-detection';
import { TimeseriesPoint } from '@/types/Timeseries';
import {
  AggregationOption,
  IncompleteDataCorrectiveAction,
  TemporalResolution,
  TemporalResolutionOption
} from '@/types/Enums';

const FEB_1970 = 2678400000;
const MAR_1970 = 5097600000;
const APR_1970 = 7776000000;
const MAY_1970 = 10368000000;
const OCT_1970 = 23587200000;
const NOV_1970 = 26265600000;
const ONE_DAY = 86400000;


describe('incomplete-data-detection', () => {
  it('returns NotRequired for mean agg', () => {
    const timeseries: TimeseriesPoint[] = [
      { timestamp: 0, value: 10 }
    ];
    const result = correctIncompleteTimeseries(timeseries, TemporalResolution.Monthly,
      TemporalResolutionOption.Year, AggregationOption.Mean, new Date(FEB_1970));

    expect(result.action).to.equal(IncompleteDataCorrectiveAction.NotRequired);
    expect(result.points.length).to.equal(1);
    expect(result.points).to.deep.equal(timeseries);
  });

  it('returns OutOfScopeData for empty data', () => {
    const result = correctIncompleteTimeseries([], TemporalResolution.Monthly,
      TemporalResolutionOption.Year, AggregationOption.Sum, new Date(FEB_1970));

    expect(result.action).to.equal(IncompleteDataCorrectiveAction.OutOfScopeData);
    expect(result.points.length).to.equal(0);
  });

  it('returns OutOfScopeData for invalid last raw date', () => {
    const timeseries: TimeseriesPoint[] = [
      { timestamp: MAR_1970, value: 10 }
    ];
    const result = correctIncompleteTimeseries(timeseries, TemporalResolution.Monthly,
      TemporalResolutionOption.Year, AggregationOption.Sum, new Date(FEB_1970));

    expect(result.action).to.equal(IncompleteDataCorrectiveAction.OutOfScopeData);
    expect(result.points.length).to.equal(1);
    expect(result.points).to.deep.equal(timeseries);
  });

  it('returns OutOfScopeData for different years', () => {
    const timeseries: TimeseriesPoint[] = [
      { timestamp: FEB_1970 * 10, value: 10 }
    ];
    const result = correctIncompleteTimeseries(timeseries, TemporalResolution.Monthly,
      TemporalResolutionOption.Year, AggregationOption.Sum, new Date(FEB_1970));

    expect(result.action).to.equal(IncompleteDataCorrectiveAction.OutOfScopeData);
    expect(result.points.length).to.equal(1);
    expect(result.points).to.deep.equal(timeseries);
  });

  it('returns OutOfScopeData for different months', () => {
    const timeseries: TimeseriesPoint[] = [
      { timestamp: FEB_1970, value: 10 }
    ];
    const result = correctIncompleteTimeseries(timeseries, TemporalResolution.Monthly,
      TemporalResolutionOption.Month, AggregationOption.Sum, new Date(OCT_1970));

    expect(result.action).to.equal(IncompleteDataCorrectiveAction.OutOfScopeData);
    expect(result.points.length).to.equal(1);
    expect(result.points).to.deep.equal(timeseries);
  });

  it('removes when low coverage', () => {
    const timeseries: TimeseriesPoint[] = [
      { timestamp: 0, value: 10 },
      { timestamp: APR_1970, value: 20 }
    ];
    const result = correctIncompleteTimeseries(timeseries, TemporalResolution.Daily,
      TemporalResolutionOption.Month, AggregationOption.Sum, new Date(APR_1970 + (2 * ONE_DAY)));

    expect(result.action).to.equal(IncompleteDataCorrectiveAction.DataRemoved);
    expect(result.points.length).to.equal(1);
    expect(result.points[0]).to.deep.equal(timeseries[0]);
  });

  it('no change on nearly full coverage', () => {
    const timeseries: TimeseriesPoint[] = [
      { timestamp: 0, value: 10 },
      { timestamp: MAY_1970, value: 20 }
    ];
    const result = correctIncompleteTimeseries(timeseries, TemporalResolution.Daily,
      TemporalResolutionOption.Month, AggregationOption.Sum, new Date(MAY_1970 + (28 * ONE_DAY)));

    expect(result.action).to.equal(IncompleteDataCorrectiveAction.CompleteData);
    expect(result.points.length).to.equal(2);
    expect(result.points[0]).to.deep.equal(timeseries[0]);
    expect(result.points).to.deep.equal(timeseries);
  });

  it('does not modify input', () => {
    const timeseries: TimeseriesPoint[] = [
      { timestamp: 0, value: 10 }
    ];
    const copy: TimeseriesPoint[] = [
      { timestamp: 0, value: 10 }
    ];
    const result = correctIncompleteTimeseries(timeseries, TemporalResolution.Monthly,
      TemporalResolutionOption.Year, AggregationOption.Sum, new Date(FEB_1970));

    expect(result.action).to.equal(IncompleteDataCorrectiveAction.DataRemoved);
    expect(result.points.length).to.equal(0);
    expect(timeseries.length).to.equal(1);
    expect(timeseries).to.deep.equal(copy);
  });

  it('extrapolates daily to month', () => {
    const timeseries: TimeseriesPoint[] = [
      { timestamp: 0, value: 10 },
      { timestamp: APR_1970, value: 20 }
    ];
    const addDays = 15;
    const result = correctIncompleteTimeseries(timeseries, TemporalResolution.Daily,
      TemporalResolutionOption.Month, AggregationOption.Sum, new Date(APR_1970 + (addDays * ONE_DAY)));

    expect(result.action).to.equal(IncompleteDataCorrectiveAction.DataExtrapolated);
    expect(result.points.length).to.equal(2);
    expect(result.points[0]).to.deep.equal(timeseries[0]);
    expect(result.points[1].value).to.equal(
      timeseries[1].value * (30 / (1 + addDays))); // +1 since we started on the first of the month
  });

  it('extrapolates weekly to month', () => {
    const timeseries: TimeseriesPoint[] = [
      { timestamp: 0, value: 10 },
      { timestamp: NOV_1970, value: 20 }
    ];
    const addDays = 18;
    const result = correctIncompleteTimeseries(timeseries, TemporalResolution.Weekly,
      TemporalResolutionOption.Month, AggregationOption.Sum, new Date(NOV_1970 + (addDays * ONE_DAY)));

    expect(result.action).to.equal(IncompleteDataCorrectiveAction.DataExtrapolated);
    expect(result.points.length).to.equal(2);
    expect(result.points[0]).to.deep.equal(timeseries[0]);
    expect(result.points[1].value).to.equal(
      timeseries[1].value * (4 / ((1 + addDays) / 7))); // +1 since we started on the first of the month
  });

  it('extrapolates dekad to month', () => {
    const timeseries: TimeseriesPoint[] = [
      { timestamp: 0, value: 10 },
      { timestamp: OCT_1970, value: 20 }
    ];
    const addDays = 19;
    const result = correctIncompleteTimeseries(timeseries, TemporalResolution.Dekad,
      TemporalResolutionOption.Month, AggregationOption.Sum, new Date(OCT_1970 + (addDays * ONE_DAY)));

    expect(result.action).to.equal(IncompleteDataCorrectiveAction.DataExtrapolated);
    expect(result.points.length).to.equal(2);
    expect(result.points[0]).to.deep.equal(timeseries[0]);
    expect(result.points[1].value).to.equal(
      timeseries[1].value * (3 / ((1 + addDays) / 10))); // +1 since we started on the first of the month
  });

  it('no change for monthly raw to month', () => {
    const timeseries: TimeseriesPoint[] = [
      { timestamp: 0, value: 10 },
      { timestamp: OCT_1970, value: 20 }
    ];
    const addDays = 2;
    const result = correctIncompleteTimeseries(timeseries, TemporalResolution.Monthly,
      TemporalResolutionOption.Month, AggregationOption.Sum, new Date(OCT_1970 + (addDays * ONE_DAY)));

    expect(result.action).to.equal(IncompleteDataCorrectiveAction.CompleteData);
    expect(result.points.length).to.equal(2);
    expect(result.points).to.deep.equal(timeseries);
  });

  it('no change for annual raw to month', () => {
    const timeseries: TimeseriesPoint[] = [
      { timestamp: 0, value: 10 },
      { timestamp: OCT_1970, value: 20 }
    ];
    const addDays = 2;
    const result = correctIncompleteTimeseries(timeseries, TemporalResolution.Annual,
      TemporalResolutionOption.Month, AggregationOption.Sum, new Date(OCT_1970 + (addDays * ONE_DAY)));

    expect(result.action).to.equal(IncompleteDataCorrectiveAction.CompleteData);
    expect(result.points.length).to.equal(2);
    expect(result.points).to.deep.equal(timeseries);
  });

  it('no change for other raw to month', () => {
    const timeseries: TimeseriesPoint[] = [
      { timestamp: 0, value: 10 },
      { timestamp: OCT_1970, value: 20 }
    ];
    const addDays = 2;
    const result = correctIncompleteTimeseries(timeseries, TemporalResolution.Other,
      TemporalResolutionOption.Month, AggregationOption.Sum, new Date(OCT_1970 + (addDays * ONE_DAY)));

    expect(result.action).to.equal(IncompleteDataCorrectiveAction.CompleteData);
    expect(result.points.length).to.equal(2);
    expect(result.points).to.deep.equal(timeseries);
  });

  it('extrapolates daily to year', () => {
    const timeseries: TimeseriesPoint[] = [
      { timestamp: 0, value: 10 }
    ];
    const dayNum = (30 * 6) + 12; // because of approximations, not all days will produce accurate results
    const result = correctIncompleteTimeseries(timeseries, TemporalResolution.Daily,
      TemporalResolutionOption.Year, AggregationOption.Sum, new Date(dayNum * ONE_DAY));

    expect(result.action).to.equal(IncompleteDataCorrectiveAction.DataExtrapolated);
    expect(result.points.length).to.equal(1);
    expect(result.points[0].value).to.be.approximately(
      timeseries[0].value * (365 / dayNum), 0.0001);
  });

  it('extrapolates weekly to year', () => {
    const timeseries: TimeseriesPoint[] = [
      { timestamp: 0, value: 10 }
    ];
    const dayNum = (30 * 6) + 23; // because of approximations, not all days will produce accurate results
    const result = correctIncompleteTimeseries(timeseries, TemporalResolution.Weekly,
      TemporalResolutionOption.Year, AggregationOption.Sum, new Date(dayNum * ONE_DAY));

    expect(result.action).to.equal(IncompleteDataCorrectiveAction.DataExtrapolated);
    expect(result.points.length).to.equal(1);
    expect(result.points[0].value).to.be.approximately(
      timeseries[0].value * (52 / (dayNum / 7)), 0.0001);
  });

  it('extrapolates dekad to year', () => {
    const timeseries: TimeseriesPoint[] = [
      { timestamp: 0, value: 10 }
    ];
    const dayNum = (30 * 6) + 5; // because of approximations, not all days will produce accurate results
    const result = correctIncompleteTimeseries(timeseries, TemporalResolution.Dekad,
      TemporalResolutionOption.Year, AggregationOption.Sum, new Date(dayNum * ONE_DAY));

    expect(result.action).to.equal(IncompleteDataCorrectiveAction.DataExtrapolated);
    expect(result.points.length).to.equal(1);
    expect(result.points[0].value).to.be.approximately(
      timeseries[0].value * (36 / (dayNum / 10)), 0.0001);
  });

  it('extrapolates month to year', () => {
    const timeseries: TimeseriesPoint[] = [
      { timestamp: 0, value: 10 }
    ];
    const result = correctIncompleteTimeseries(timeseries, TemporalResolution.Monthly,
      TemporalResolutionOption.Year, AggregationOption.Sum, new Date(OCT_1970));

    expect(result.action).to.equal(IncompleteDataCorrectiveAction.DataExtrapolated);
    expect(result.points.length).to.equal(1);
    expect(result.points[0].value).to.equal(timeseries[0].value * (12 / 10));
  });

  it('no change for annual raw to year', () => {
    const timeseries: TimeseriesPoint[] = [
      { timestamp: 0, value: 10 }
    ];
    const dayNum = 12;
    const result = correctIncompleteTimeseries(timeseries, TemporalResolution.Annual,
      TemporalResolutionOption.Year, AggregationOption.Sum, new Date(dayNum * ONE_DAY));

    expect(result.action).to.equal(IncompleteDataCorrectiveAction.CompleteData);
    expect(result.points.length).to.equal(1);
    expect(result.points).to.deep.equal(timeseries);
  });

  it('no change for other raw to year', () => {
    const timeseries: TimeseriesPoint[] = [
      { timestamp: 0, value: 10 }
    ];
    const dayNum = 25;
    const result = correctIncompleteTimeseries(timeseries, TemporalResolution.Other,
      TemporalResolutionOption.Year, AggregationOption.Sum, new Date(dayNum * ONE_DAY));

    expect(result.action).to.equal(IncompleteDataCorrectiveAction.CompleteData);
    expect(result.points.length).to.equal(1);
    expect(result.points).to.deep.equal(timeseries);
  });
});



