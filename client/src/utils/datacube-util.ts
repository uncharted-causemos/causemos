const COLUMN_BLACKLIST = [
  'id',
  'model_id',
  'label',
  'type',
  'model_description',
  'output_description',
  'output_units_description',
  'parameter_descriptions'
];

const DISPLAY_NAMES = {
  category: 'Category',
  maintainer: 'Maintainer',
  model: 'Output Variable',
  output_name: 'Output Units',
  output_units: 'Output Units',
  parameters: 'Input Knobs',
  source: 'Source'
};

export default {
  COLUMN_BLACKLIST,
  DISPLAY_NAMES
};
