export enum OptionButtonMenu {
  Rename = 'Rename',
  Duplicate = 'Duplicate',
  Delete = 'Delete',
  DeleteEdge = 'DeleteEdge',
  ChangeDataset = 'ChangeDataset',
  RemoveDataset = 'RemoveDataset',
}

export const MENU_OPTIONS = {
  DELETE: {
    type: OptionButtonMenu.Delete,
    text: 'Delete',
    icon: 'fa-trash',
  },
  CHANGE_DATASET: {
    type: OptionButtonMenu.ChangeDataset,
    text: 'Change dataset',
    icon: 'fa-repeat',
  },
  REMOVE_DATASET: {
    type: OptionButtonMenu.RemoveDataset,
    text: 'Remove dataset',
    icon: 'fa-times-circle',
  },
  RENAME: {
    type: OptionButtonMenu.Rename,
    text: 'Rename',
    icon: 'fa-pencil',
  },
  DUPLICATE: {
    type: OptionButtonMenu.Duplicate,
    text: 'Duplicate',
    icon: 'fa-copy',
  },
};

export enum DropdownOptions {
  Dataset = 'Dataset',
  Index = 'Index',
}
