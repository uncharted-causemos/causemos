import { Model, ModelParameter } from '@/types/Datacube';
import { ModelRunStatus } from '@/types/Enums';
import { ModelRunParameter } from '@/types/ModelRun';
import {
  getParameterTooltip,
  getSharedParameters,
  getSharedParametersFromModelRuns,
} from '@/utils/model-run-util';
import _ from 'lodash';

describe('model-run-util', () => {
  describe('getSharedParameters', () => {
    const testArray: ModelRunParameter[] = [
      { name: 'a', value: 'testValue' },
      { name: 'b', value: 'testValue2' },
    ];
    const testArray2: ModelRunParameter[] = [
      { name: 'a', value: 'testValue' },
      { name: 'b', value: 'testValue3' },
    ];

    it('should return [] when both arrays are empty', () => {
      const result = getSharedParameters([], []);
      expect(result).toHaveLength(0);
    });
    it('should return [] when one array is empty', () => {
      const result = getSharedParameters(testArray, []);
      expect(result).toHaveLength(0);
    });
    it('should return all elements from two identical arrays', () => {
      const result = getSharedParameters(testArray, [...testArray]);
      result.forEach((parameter) => {
        expect(testArray.includes(parameter));
      });
      testArray.forEach((parameter) => {
        expect(result.includes(parameter));
      });
    });
    it('should correctly return the overlap from two arrays', () => {
      const result = getSharedParameters(testArray, testArray2);
      expect(result.length === 1);
      expect(result[0] === testArray[0]);
    });
  });

  describe('getSharedParametersFromModelRuns', () => {
    const testModelRun = {
      id: '',
      name: '',
      model_name: '',
      model_id: '',
      created_at: 0,
      flow_id: '',
      use_case_id: '',
      data_paths: [],
      pre_gen_output_paths: [],
      is_default_run: true,
      tags: [],
      status: ModelRunStatus.Ready,
      parameters: [{ name: 'name1', value: 'value1' }],
      output_agg_values: [],
      runtimes: {
        execution: {
          start_time: 0,
          end_time: 0,
        },
        post_processing: {
          start_time: 0,
          end_time: 0,
        },
      },
    };
    const testModelRun2 = _.cloneDeep(testModelRun);
    testModelRun2.parameters.push(
      { name: 'name2', value: 'value2' },
      { name: 'name1', value: 'value3' }
    );

    it('should return [] when passed an empty array of model runs', () => {
      const result = getSharedParametersFromModelRuns([]);
      expect(result).toHaveLength(0);
    });
    it('should return [] when passed an array with one model run', () => {
      const result = getSharedParametersFromModelRuns([testModelRun]);
      expect(result).toHaveLength(0);
    });
    it('should correctly return the overlap from two model runs', () => {
      const result = getSharedParametersFromModelRuns([testModelRun, testModelRun2]);
      expect(result).toHaveLength(1);
      expect(result[0] === testModelRun.parameters[0]);
    });
  });

  describe('getParameterTooltip', () => {
    const testModel = {
      parameters: [
        { name: 'parameterName', unit: 'testUnit', description: 'testDescription' },
      ] as ModelParameter[],
    } as unknown as Model;
    it('should return an empty string if the metadata does not contain the parameter', () => {
      const result = getParameterTooltip(testModel, 'wrongParameterName');
      expect(result).toHaveLength(0);
    });
    it('should output the correct HTML string', () => {
      const result = getParameterTooltip(testModel, 'parameterName');
      expect(result).to.equal('<div><p>parameterName (testUnit)</p><p>testDescription</p><div>');
    });
  });
});
