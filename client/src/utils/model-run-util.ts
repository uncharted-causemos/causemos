import { Model } from '@/types/Datacube';
import { ModelRun, ModelRunParameter } from '@/types/ModelRun';

export const getSharedParameters = (
  parametersA: ModelRunParameter[],
  parametersB: ModelRunParameter[]
) => {
  const isParameterSameInParametersB = (parameter: ModelRunParameter) => {
    const found = parametersB.find((p) => p.name === parameter.name);
    return found !== undefined && found.value === parameter.value;
  };
  return parametersA.filter(isParameterSameInParametersB);
};

export const getSharedParametersFromModelRuns = (modelRuns: ModelRun[]) => {
  if (modelRuns.length < 2) return [];
  return modelRuns
    .slice(1)
    .reduce(
      (sharedParameters, run) => getSharedParameters(sharedParameters, run.parameters),
      modelRuns[0].parameters
    );
};

export const getParameterTooltip = (metadata: Model, parameterName: string) => {
  const parameterMetadata = metadata.parameters.find(
    (parameter) => parameter.name === parameterName
  );
  if (parameterMetadata === undefined) return '';
  const { description, unit } = parameterMetadata;
  const unitString = unit.length !== 0 ? ` (${unit})` : '';
  return `<div><p>${parameterName}${unitString}</p><p>${description}</p><div>`;
};
