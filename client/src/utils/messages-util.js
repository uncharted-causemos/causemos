export const ADD_TO_CAG_THRESHOLD = 1000;

export const SERVICE_NOT_AVAILABLE = 'Service not available at the moment';

export const SIDE_PANEL = {
  INDICATORS_PANE_INTERVENTION_NODES: 'Intervention nodes do not have indicators associated',
  INDICATORS_PANE_NO_INDICATOR: 'Automatic mapping did not find an indicator to quantify this node. Click "Edit" to search for one.',
  EVIDENCE_NO_DATA: 'No evidence in Knowledge Base',
  FACTORS_NO_DATA: 'Concept not in a relationship yet'
};

export const CORRECTIONS = {
  SUCCESSFUL_CORRECTION: 'Successful correction',
  ERRONEOUS_CORRECTION: 'Correction was unsuccessful. Try again',
  EMPTY_CORRECTION: 'There are no statements to correct. Try again'
};

export const UNKNOWN_POLARITY_BULK_MESSAGE = {
  NOTE: 'Note: The subject and sometime the object in a causal assertion in English often have implied positive polarity (e.g. Revived interest in traditional medecine has resulted in exploitation of indigeneous knowledge.). Also, modeling engines require all polarities to be defined and will reject or convert to positive all remaining unknown polarities at export time.',
  WARNING: 'Warning: This operation cannot be undone.'
};

export const EXPORT_MESSAGES = {
  NOT_SAVED_MODELS: 'There are not saved models',
  COMMENT_NOT_SAVED: 'Comment could not be saved'
};

export const NEW_EVIDENCE = {
  SUCCESSFUL_SUBMISSION: 'Text sent successfully to Eidos for parsing. Will let you know when the new statement(s) are available',
  ERRONEOUS_SUBMISSION: 'Could not send text to Eidos. Try again later',
  EMPTY_SUBMISSION: 'There is no evidence submitted. Try again',
  ERRONEOUS_RESPONSE: 'Could not create new statement(s) due to error. Try again',
  SUCCESSFUL_MERGE: 'Statements successfully added to the knowledge base',
  ERRONEOUS_MERGE: 'Merge was unsuccessful. Try again'
};

export const CURATIONS = {
  SUCCESSFUL_CURATION: 'Positive feedback sent to INDRA',
  ERRONEOUS_CURATION: 'Curation was unsuccessful. Try again'
};

export const UPDATE_BELIEF_SCORE = {
  SUCCESSFUL_SUBMISSION: 'Belief scores successfully updated',
  ERRONEOUS_SUBMISSION: 'There was an error in updating belief scores. Try again later'
};

export const ONTOLOGY_AUGMENTATION = {
  SUCCESSFUL_ADDITION: 'New concept succesfully added',
  ERRONEOUS_ADDITION: 'There was an error in adding a new concept.'
};

export const MODEL_CHECKING = {
  EXCEEDED_POOLING_THRESHOLD: 'Exceeded polling threshold',
  FAILED_EXPORT_MODEL: 'Failed to export model'
};

export const UPDATE_GROUNDINGS = {
  SUCCESSFUL_SUBMISSION: 'Successful submission. New concepts will be ready in a few minutes',
  ERRONEOUS_SUBMISSION: 'There was an error in updating concepts. Try again later'
};

export const MODEL_CREATION = {
  REMOVE_UNKNOWN_POLARITIES: 'There are statements with unknown polarities',
  REMOVE_SAME_OPPOSITE_POLARITIES: 'There are statements with both same and opposite polarities'
};

export const DATE_SELECTION = {
  START_DATE_AFTER_END_DATE: 'The start date you entered occurs after the end date',
  END_DATE_BEFORE_START_DATE: 'The end date you entered occurs before the start date'
};

export const EMPTY_INPUT_PARAMS = 'There are no input parameters for this emulator';

export const BOOKMARKS = {
  SUCCESSFUL_ADDITION: 'New insight succesfully added',
  ERRONEOUS_ADDITION: 'There was an error in creating a new insight',
  SUCCESSFUL_REMOVAL: 'Insight succesfully removed',
  ERRONEOUS_REMOVAL: 'There was an error in removing the insight',
  SUCCESFUL_UPDATE: 'Insight succesfully updated',
  ERRONEOUS_UPDATE: 'There was an error in updating the insight',
  NO_DATA: 'No insights have been saved'
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

export const ANALYSIS = {
  SUCCESSFUL_DELETION: 'Analysis succesfully deleted',
  ERRONEOUS_DELETION: 'There was an error in deleting the Analysis. Try again',
  SUCCESSFUL_RENAME: 'Analysis successfully renamed',
  ERRONEOUS_RENAME: 'There was an error in renaming the Analysis. Try again',
  SUCCESSFUL_DUPLICATE: 'Analysis succesfully duplicated',
  ERRONEOUS_DUPLICATE: 'There was an error in duplicating the Analysis. Try again'
};

export const SUBGRAPH = {
  TOO_MANY_EDGES: `Select ${ADD_TO_CAG_THRESHOLD} or fewer edges to add to CAG`
};

export default {
  SIDE_PANEL,
  CORRECTIONS,
  UNKNOWN_POLARITY_BULK_MESSAGE,
  EXPORT_MESSAGES,
  NEW_EVIDENCE,
  CURATIONS,
  UPDATE_BELIEF_SCORE,
  ONTOLOGY_AUGMENTATION,
  MODEL_CHECKING,
  UPDATE_GROUNDINGS,
  SERVICE_NOT_AVAILABLE,
  MODEL_CREATION,
  DATE_SELECTION,
  EMPTY_INPUT_PARAMS,
  BOOKMARKS,
  CAG,
  SUBGRAPH
};

