const cleanParameterName = (paramName) => {
  return paramName.split('_').join(' ');
};

export default function (run) {
  let displayName = '';
  Object.values(run.parameters).forEach((parameter, index) => {
    displayName +=
      (index > 0 ? ', ' : '') + cleanParameterName(parameter.name) + ': ' + parameter.value;
  });
  return displayName;
}
