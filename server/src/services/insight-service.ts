import { v4 as uuid } from 'uuid';
import Logger from '#@/config/logger.js';
import * as es from '#@/adapters/es/adapter.js';
import sharp from 'sharp';

const { Adapter, RESOURCE } = es;

const MAX_INSIGHTS = 300;
const TARGET_THUMBNAIL_WIDTH = 200;

const resizeImage = async (base64Str: string, targetWidthInPixels: number) => {
  const parts = base64Str.split(';');
  const mimType = parts[0].split(':')[1];
  const imageData = parts[1].split(',')[1];
  const img = Buffer.from(imageData, 'base64');

  const metadata = await sharp(img).metadata();
  const w = metadata.width as number;
  const h = metadata.height as number;

  // Calculate how much we need to scale the image so that its new width is
  //  approximately `targetWidthInPixels`.
  const quotient = w / targetWidthInPixels;
  // If the width is already smaller than the target width, don't scale it down.
  const scaleFactor = quotient < 1 ? 1 : 1 / quotient;

  const data = await sharp(img)
    .resize(Math.floor(w * scaleFactor), Math.floor(h * scaleFactor))
    .toBuffer();

  const resizedStr = `data:${mimType};base64,${data.toString('base64')}`;
  return resizedStr;
};

/**
 * Wrapper to create a new insight.
 */
export const createInsight = async (
  name: string,
  description: string,
  projectId: string,
  contextId: string,
  url: string,
  image: string,
  viewState: any,
  dataState: any,
  // eslint-disable-next-line camelcase
  annotation_state: any,
  metadata: any,
  schemaVersion: any,
  type: string,
  view: any,
  state: any
) => {
  const newId = uuid();
  Logger.info('Creating insight entry: ' + newId);
  const insightsConnection = Adapter.get(RESOURCE.INSIGHT);
  const keyFn = (doc: any) => {
    return doc.id;
  };

  // Create a thumbnail
  const thumbnail = await resizeImage(image, TARGET_THUMBNAIL_WIDTH);

  await insightsConnection.insert(
    {
      id: newId,
      name,
      description,
      modified_at: Date.now(),
      project_id: projectId,
      context_id: contextId,
      url,
      image,
      thumbnail,
      view_state: viewState,
      data_state: dataState,
      annotation_state: annotation_state,
      metadata,
      schemaVersion,
      type,
      view,
      state,
    },
    keyFn
  );

  // Acknowledge success
  return { id: newId };
};

export const updateInsight = async (id: string, insight: any) => {
  const connection = Adapter.get(RESOURCE.INSIGHT);
  if (insight.image) {
    insight.thumbnail = await resizeImage(insight.image, TARGET_THUMBNAIL_WIDTH);
  }
  const result = await connection.update(
    {
      id: id,
      ...insight,
    },
    (d: any) => d.id
  );
  if (result.errors) {
    throw new Error(JSON.stringify(result.items[0]));
  }
};

/**
 * Returns a list of insights that match a filter
 */
export const getAllInsights = async (filterParams, options) => {
  const insightsConnection = Adapter.get(RESOURCE.INSIGHT);
  if (!options.size) {
    options.size = MAX_INSIGHTS;
  }
  const results = await insightsConnection.find(filterParams, options);
  return results;
};

export const getInsight = async (insightId: string, _allowList?: any) => {
  const insightsConnection = Adapter.get(RESOURCE.INSIGHT);
  const result = await insightsConnection.findOne([{ field: 'id', value: insightId }], {});
  return result;
};

export const getInsightThumbnail = async (insightId: string) => {
  const insightsConnection = Adapter.get(RESOURCE.INSIGHT);
  const result = await insightsConnection.findOne([{ field: 'id', value: insightId }], {
    includes: ['thumbnail'],
  });
  return result;
};

export const count = async (projectId?: string, contextId?: string) => {
  const insightsConnection = Adapter.get(RESOURCE.INSIGHT);
  const searchFilters: any[] = [];
  if (projectId) {
    searchFilters.push({
      field: 'project_id',
      value: projectId,
    });
  }
  if (contextId !== undefined) {
    searchFilters.push({
      field: 'context_id',
      value: contextId,
    });
  }
  const c = await insightsConnection.count(searchFilters);
  return c;
};

export const remove = async (insightId: string) => {
  Logger.info('Deleting insight:' + insightId);
  const insightsConnection = Adapter.get(RESOURCE.INSIGHT);
  const stats = await insightsConnection.remove([{ field: 'id', value: insightId }]);
  Logger.info(`Deleted insight: ${insightId}`);
  return stats;
};
