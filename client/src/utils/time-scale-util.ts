import { TimeScale } from '@/types/Enums';

interface TimeScaleOption {
  id: TimeScale;
  label: string;
  timeSlices: { months: number; label: string; shortLabel: string }[];
  example: string;
}

export const TIME_SCALE_OPTIONS: TimeScaleOption[] = [
  {
    id: TimeScale.Months,
    label: 'Months',
    timeSlices: [
      { months: 3, label: '3 months', shortLabel: '3m' },
      { months: 6, label: '6 months', shortLabel: '6m' },
      { months: 9, label: '9 months', shortLabel: '9m' },
      { months: 12, label: '12 months', shortLabel: '12m' },
    ],
    example: 'Locust outbreaks',
  },
  {
    id: TimeScale.Years,
    label: 'Years',
    timeSlices: [
      { months: 3 * 12, label: '3 years', shortLabel: '3y' },
      { months: 6 * 12, label: '6 years', shortLabel: '6y' },
      { months: 9 * 12, label: '9 years', shortLabel: '9y' },
      { months: 12 * 12, label: '12 years', shortLabel: '12y' },
    ],
    example: 'Malnutrition',
  },
];

// Make a map version of the time scale options for faster and simpler retrieval
export const TIME_SCALE_OPTIONS_MAP = TIME_SCALE_OPTIONS.reduce(
  (existingMap, currentTimeScaleOption) => {
    existingMap.set(currentTimeScaleOption.id, currentTimeScaleOption);
    return existingMap;
  },
  new Map<string, TimeScaleOption>()
);

export const getTimeScaleOption = (timeScale: TimeScale) => {
  const timeScaleOption = TIME_SCALE_OPTIONS_MAP.get(timeScale);
  if (timeScaleOption === undefined) {
    console.error('Unable to find time scale option with ID ' + timeScale);
    return TIME_SCALE_OPTIONS[0];
  }
  return timeScaleOption;
};

export const getSliceMonthIndicesFromTimeScale = (timeScale: TimeScale) => {
  return getTimeScaleOption(timeScale).timeSlices.map((timeSlice) => {
    const monthCount = timeSlice.months;
    // Time scale timesteps are 1-indexed, so subtract 1 to get the actual number
    //  of months to add to the projection_start date
    const monthIndex = monthCount - 1;
    return monthIndex;
  });
};

export const getLastTimeStepIndexFromTimeScale = (timeScale: TimeScale) => {
  const timeSliceMonths = getSliceMonthIndicesFromTimeScale(timeScale);
  return timeSliceMonths[timeSliceMonths.length - 1];
};

export const getProjectionLengthFromTimeScale = (timeScale: TimeScale) => {
  const timeSlices = getTimeScaleOption(timeScale).timeSlices;
  return timeSlices[timeSlices.length - 1].months;
};

export const getMonthsPerTimestepFromTimeScale = (timeScale: TimeScale) => {
  switch (timeScale) {
    case TimeScale.Months:
      return 1;
    case TimeScale.Years:
      return 12;
    default:
      return 1;
  }
};

export const getStepCountFromTimeScale = (timeScale: TimeScale) => {
  // Divide number of months by number of months per step to get number of
  //  steps
  const monthsInProjection = getProjectionLengthFromTimeScale(timeScale);
  return monthsInProjection / getMonthsPerTimestepFromTimeScale(timeScale);
};

export const getRangeFromTimeScale = (timeScale: TimeScale, history_range: number) => {
  return history_range / getMonthsPerTimestepFromTimeScale(timeScale);
};
