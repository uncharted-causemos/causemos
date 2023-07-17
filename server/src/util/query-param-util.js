// This file contains utility functions to parse query parameter values

// Parse comma separated string representing output task, 'selected_output_tasks' and return an array strings
// Available string values are "compute_global_timeseries", "compute_regional_stats", "compute_regional_timeseries", "compute_regional_aggregation", and "compute_tiles"
const getSelectedOutputTasks = (query) => {
  const value = query.selected_output_tasks || '';
  return value.trim() ? value.split(',').map((s) => s.trim()) : [];
};

module.exports = {
  getSelectedOutputTasks,
};
