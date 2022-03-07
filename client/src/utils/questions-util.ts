import { AnalyticalQuestion } from '@/types/Insight';
import _ from 'lodash';

export const SORT_PATH = 'view_state.analyticalQuestionOrder';
export function sortQuestionsByPath(questions: AnalyticalQuestion[]): AnalyticalQuestion[] {
  return _.sortBy(questions, SORT_PATH);
}
