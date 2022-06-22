export const ADD_TO_CAG_THRESHOLD = 1000;

export const SERVICE_NOT_AVAILABLE = 'Service not available at the moment';

export const SIDE_PANEL = {
  EVIDENCE_NO_DATA: 'No evidence in Knowledge Base',
  FACTORS_NO_DATA: 'Concept not in a relationship yet'
};

export const CORRECTIONS = {
  SUCCESSFUL_CORRECTION: 'Successful correction',
  ERRONEOUS_CORRECTION: 'Correction was unsuccessful. Try again'
};

export const UNKNOWN_POLARITY_BULK_MESSAGE = {
  NOTE: 'Note: The subject and sometime the object in a causal assertion in English often have implied positive polarity (e.g. Revived interest in traditional medecine has resulted in exploitation of indigeneous knowledge.). Also, modeling engines require all polarities to be defined and will reject or convert to positive all remaining unknown polarities at export time.',
  WARNING: 'Warning: This operation cannot be undone.'
};

export const EXPORT_MESSAGES = {
  COMMENT_NOT_SAVED: 'Comment could not be saved'
};

export const CURATIONS = {
  SUCCESSFUL_CURATION: 'Positive feedback sent to INDRA',
  ERRONEOUS_CURATION: 'Curation was unsuccessful. Try again'
};

export const EMPTY_INPUT_PARAMS = 'There are no input parameters for this emulator';

export const INSIGHTS = {
  SUCCESSFUL_ADDITION: 'New insight succesfully added',
  ERRONEOUS_ADDITION: 'There was an error in creating a new insight',
  SUCCESSFUL_REMOVAL: 'Insight succesfully removed',
  ERRONEOUS_REMOVAL: 'There was an error in removing the insight',
  SUCCESSFUL_UPDATE: 'Insight succesfully updated',
  ERRONEOUS_UPDATE: 'There was an error in updating the insight',
  NO_DATA: 'No insights have been saved'
};

export const QUESTIONS = {
  SUCCESSFUL_ADDITION: 'New question succesfully added',
  ERRONEOUS_ADDITION: 'There was an error in creating a new question',
  SUCCESSFUL_REMOVAL: 'Question succesfully removed',
  ERRONEOUS_REMOVAL: 'There was an error in removing the question',
  SUCCESSFUL_UPDATE: 'Question succesfully updated',
  ERRONEOUS_UPDATE: 'There was an error in updating the question',
  NO_DATA: 'No questions have been saved'
};

export const CAG = {
  SUCCESSFUL_DELETION: 'CAG succesfully deleted',
  ERRONEOUS_DELETION: 'There was an error in deleting the CAG. Try again',
  SUCCESSFUL_RENAME: 'CAG successfully renamed',
  ERRONEOUS_RENAME: 'There was an error in renaming the CAG. Try again',
  ERRONEOUS_MODEL_RUN: 'There was an error when running the model. Try again',
  SUCCESSFUL_DUPLICATE: 'CAG succesfully duplicated',
  ERRONEOUS_DUPLICATE: 'There was an error in duplicating the CAG. Try again'
};

export const QUANTIFICATION = {
  ERRONEOUS_PARAMETER_CHANGE: 'Unable to save node parameter changes.'
};

export const ANALYSIS = {
  SUCCESSFUL_DELETION: 'Analysis succesfully deleted',
  ERRONEOUS_DELETION: 'There was an error in deleting the Analysis. Try again',
  SUCCESSFUL_RENAME: 'Analysis successfully renamed',
  ERRONEOUS_RENAME: 'There was an error in renaming the Analysis. Try again',
  SUCCESSFUL_DUPLICATE: 'Analysis succesfully duplicated',
  ERRONEOUS_DUPLICATE: 'There was an error in duplicating the Analysis. Try again',
  SUCCESSFUL_DELETION_UNINITIALIZED: 'Uninitialized analysis successfully deleted',
  ERRONEOUS_DELETION_UNINITIALIZED: 'There was an error in deleting the uninitialized analysis.'
};

export const SUBGRAPH = {
  TOO_MANY_EDGES: `Select ${ADD_TO_CAG_THRESHOLD} or fewer edges to add to CAG`
};

export default {
  SIDE_PANEL,
  CORRECTIONS,
  UNKNOWN_POLARITY_BULK_MESSAGE,
  EXPORT_MESSAGES,
  CURATIONS,
  SERVICE_NOT_AVAILABLE,
  EMPTY_INPUT_PARAMS,
  INSIGHTS,
  CAG,
  SUBGRAPH
};

