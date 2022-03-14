import { Engine } from '@/types/Enums';

export const supportsPolarityInference = (engine: Engine) => {
  return engine === Engine.Delphi || engine === Engine.DelphiDev;
};

export const supportsLevelEdges = (engine: Engine) => {
  return [Engine.DySE, Engine.Sensei].includes(engine);
};
