export type IndexNodeType = 'Index' | 'OutputIndex' | 'Dataset';
// Dataset is leaf node

export interface IndexNode {
  type: IndexNodeType;
  name: string;
  weight?: number;
  inputs?: IndexNode[];
}
export interface Dataset extends IndexNode {
  type: 'Dataset';
  weight: number;
  datasetId: string; // or datacubeId
  datasetName: string;
  isInverted: boolean;
  source: string;
  // And other metadata properties as needed
}

export interface Index extends IndexNode {
  type: 'Index';
  weight: number;
  inputs: Dataset[];
}

export interface OutputIndex extends IndexNode {
  type: 'OutputIndex';
  inputs: (Dataset | Index)[];
}

// Example data
const _mockData: OutputIndex = {
  type: 'OutputIndex',
  name: 'Overall Priority',
  inputs: [
    {
      type: 'Index',
      name: 'Highest risk of drought',
      weight: 20,
      inputs: [
        {
          type: 'Dataset',
          name: 'Greatest Recent Temperature Increase',
          weight: 100,
          datasetId: 'b935f602-30b2-48bc-bdc8-10351bbffa67',
          datasetName: 'Palmer Drought Severity Index (PDSI)',
          isInverted: false,
          source: 'TerraClimate',
        },
      ],
    },
    {
      type: 'Index',
      name: 'Highest risk of conflict',
      weight: 10,
      inputs: [
        {
          type: 'Dataset',
          name: 'Greatest Recent Temperature Increase',
          weight: 90,
          datasetId: 'b935f602-30b2-48bc-bdc8-10351bbffa67',
          datasetName: 'Palmer Drought Severity Index (PDSI)',
          isInverted: false,
          source: 'TerraClimate',
        },
        {
          type: 'Dataset',
          name: 'Displaced Persons Index',
          weight: 10,
          datasetId: 'd7f69937-060d-44e8-8a04-22070ce35b27',
          datasetName: 'Displaced Persons Index',
          isInverted: false,
          source: 'XY University',
        },
      ],
    },
    {
      type: 'Dataset',
      name: 'Highest Risk of Flooding',
      weight: 10,
      datasetId: 'd7f69937-060d-44e8-8a04-22070ce35b27',
      datasetName: 'flooding dataset',
      isInverted: true,
      source: 'XY University',
    },
    {
      type: 'Index',
      name: 'Largest vulnerable population',
      weight: 60,
      inputs: [
        {
          type: 'Dataset',
          name: 'Highest poverty index ranking',
          weight: 80,
          datasetId: 'b935f602-30b2-48bc-bdc8-10351bbffa67',
          datasetName: 'Poverty indicator index',
          isInverted: false,
          source: 'UN',
        },
        {
          type: 'Dataset',
          name: 'World Population By Country',
          weight: 20,
          datasetId: 'd7f69937-060d-44e8-8a04-22070ce35b27',
          datasetName: 'World Population By Country',
          isInverted: false,
          source: 'UN',
        },
      ],
    },
  ],
};
