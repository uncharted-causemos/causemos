// This file contains utility functions to parse query parameter values

// Parse comma separated string representing output task, 'selected_output_tasks' and return an array strings
export const getSelectedOutputTasks = (query: Record<string, any>): string[] => {
  const value = (query.selected_output_tasks as string) || '';
  return value.trim() ? value.split(',').map((s) => s.trim()) : [];
};
