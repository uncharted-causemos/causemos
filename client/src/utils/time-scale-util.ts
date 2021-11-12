import { TimeScale } from '@/types/Enums';

interface TimeScaleOption {
  id: TimeScale;
  label: string;
  timeSlices: [
    { months: number; label: string },
    { months: number; label: string },
    { months: number; label: string }
  ];
  example: string;
}

export const TIME_SCALE_OPTIONS: TimeScaleOption[] = [
  {
    id: TimeScale.Months,
    label: 'Months',
    timeSlices: [
      { months: 1, label: 'several weeks' },
      { months: 3, label: 'a few months' },
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
