import { TimeScale } from '@/types/Enums';

interface TimeScaleOption {
  id: TimeScale;
  label: string;
  timeSlices: { months: number; label: string }[];
  example: string;
}

export const TIME_SCALE_OPTIONS: TimeScaleOption[] = [
  {
    id: TimeScale.Months,
    label: 'Months',
    timeSlices: [
      { months: 3, label: 'several weeks' },
      { months: 6, label: 'a few months' },
      { months: 9, label: 'a few months' },
      { months: 12, label: 'about a year' }
    ],
    example: 'Locust outbreaks'
  },
  {
    id: TimeScale.Years,
    label: 'Years',
    timeSlices: [
      { months: 3, label: 'a few months' },
      { months: 12, label: 'about a year' },
      { months: 36, label: 'a few years' }
    ],
    example: 'Malnutrition'
  },
  {
    id: TimeScale.Decades,
    label: 'Decades',
    timeSlices: [
      { months: 36, label: 'a few years' },
      { months: 120, label: 'about a decade' },
      { months: 360, label: 'a few decades' }
    ],
    example: 'Climate change'
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

export const getSliceMonthsFromTimeScale = (timeScale: TimeScale) => {
  const timeScaleOption = TIME_SCALE_OPTIONS_MAP.get(timeScale);
  if (timeScaleOption === undefined) {
    console.error('Unable to find time scale option with ID ' + timeScale);
  }
  return (
    timeScaleOption?.timeSlices?.map(timeSlice => timeSlice.months) ?? [
      3,
      12,
      36
    ]
  );
};

export const getLastTimeStepFromTimeScale = (timeScale: TimeScale) => {
  const timeSliceMonths = getSliceMonthsFromTimeScale(timeScale);
  return timeSliceMonths[timeSliceMonths.length - 1];
};
