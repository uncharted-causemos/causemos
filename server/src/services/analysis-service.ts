import _ from 'lodash';
import { v4 as uuid } from 'uuid';
import { Adapter, RESOURCE } from '#@/adapters/es/adapter.js';

export const find = async (simpleFilters: any, size: number, from: number, sort: any) => {
  const connection = Adapter.get(RESOURCE.ANALYSIS);
  if (_.isNil(size)) size = 20;
  if (_.isNil(sort)) sort = { modified_at: 'desc' };
  return connection.find(simpleFilters, { size, from, sort });
};

export const createAnalysis = async (payload: any) => {
  const connection = Adapter.get(RESOURCE.ANALYSIS);
  const newId = uuid();
  const ts = new Date().getTime();

  const result = await connection.insert(
    {
      id: newId,
      title: payload.title,
      description: payload.description,
      project_id: payload.project_id,
      created_at: ts,
      modified_at: ts,
      state: payload.state,
    },
    (d: any) => d.id
  );

  if (result.errors) {
    throw new Error(JSON.stringify(result.items[0]));
  }

  return { id: newId };
};

export const updateAnalysis = async (id: string, payload: any) => {
  const connection = Adapter.get(RESOURCE.ANALYSIS);
  const ts = new Date().getTime();

  const result = await connection.update(
    {
      id: id,
      modified_at: ts,
      ...payload,
    },
    (d: any) => d.id
  );
  if (result.errors) {
    throw new Error(JSON.stringify(result.items[0]));
  }
};

export const getAnalysisItem = async (analysisId: string, analysisItemId: string) => {
  const connection = Adapter.get(RESOURCE.ANALYSIS);
  const analysis = await connection.findOne([{ field: 'id', value: analysisId }], {
    includes: 'state.analysisItems',
  });
  // TODO: Analysis item id is `id` for new analysis item schema and `itemId` for old schema. Once fully migrated to new schema, remove the usage of `itemId`
  return (
    (analysis?.state?.analysisItems || []).find(
      (item: any) => item.id === analysisItemId || item.itemId === analysisItemId
    ) || null
  );
};

// Note: Use this function for updating individual analysis items instead of `updateAnalysis`.
// `updateAnalysis` replaces the entire `analysisItems` list, risking unexpected results in race conditions.
// While this function doesn't guarantee atomic updates, it reduces the chance of lost updates
// by fetching the latest document just before making the update.
export const updateAnalysisItem = async (
  analysisId: string,
  analysisItemId: string,
  analysisItemPayload: any
) => {
  const connection = Adapter.get(RESOURCE.ANALYSIS);
  const analysis = await connection.findOne([{ field: 'id', value: analysisId }], {
    includes: 'state.analysisItems',
  });
  const items = analysis?.state?.analysisItems ?? [];
  // TODO: Analysis item id is `id` for new analysis item schema and `itemId` for old schema. Once fully migrated to new schema, remove the usage of `itemId`
  const newItems = items.map((item: any) =>
    item.id === analysisItemId || item.itemId === analysisId
      ? { ...item, ...analysisItemPayload }
      : item
  );
  const result = await updateAnalysis(analysisId, { state: { analysisItems: newItems } });
  return result;
};

export const deleteAnalysis = async (id: string) => {
  const connection = Adapter.get(RESOURCE.ANALYSIS);

  const results = await connection.remove([{ field: 'id', value: id }]);
  if (!results.deleted) {
    throw new Error(`Unable to delete analysis: ${id}`);
  }
  return true;
};
