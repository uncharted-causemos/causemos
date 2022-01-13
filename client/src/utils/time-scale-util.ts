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
      { months: 12, label: '12 months', shortLabel: '12m' }
    ],
    example: 'Locust outbreaks'
  },
  {
    id: TimeScale.Years,
    label: 'Years',
    timeSlices: [
      { months: 12, label: '1 year', shortLabel: '1y' },
      { months: 24, label: '2 years', shortLabel: '2y' },
      { months: 36, label: '3 years', shortLabel: '3y' },
      { months: 48, label: '4 years', shortLabel: '4y' }
    ],
    example: 'Malnutrition'
  }
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
  }
  return TIME_SCALE_OPTIONS[0];
};

export const getSliceMonthIndicesFromTimeScale = (timeScale: TimeScale) => {
  return getTimeScaleOption(timeScale).timeSlices.map(timeSlice => {
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
