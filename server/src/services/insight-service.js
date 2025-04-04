const { v4: uuid } = require('uuid');
const Logger = require('#@/config/logger.js');
const es = require('#@/adapters/es/adapter.js');
const sharp = require('sharp');

const Adapter = es.Adapter;
const RESOURCE = es.RESOURCE;

const MAX_INSIGHTS = 300;
const TARGET_THUMBNAIL_WIDTH = 200;

const resizeImage = async (base64Str, targetWidthInPixels) => {
  const parts = base64Str.split(';');
  const mimType = parts[0].split(':')[1];
  const imageData = parts[1].split(',')[1];
  const img = Buffer.from(imageData, 'base64');

  const metadata = await sharp(img).metadata();
  const w = metadata.width;
  const h = metadata.height;

  // Calculate how much we need to scale the image so that its new width is
  //  approximately `targetWidthInPixels`.
  // E.g. if width is 400 and targetWidth is 200, we need to make it 2x smaller.
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
 *
 * @param {string} projectId - project id
 * @param {string} title - insight title
 * @param {string} description - insight description
 * @param {string} url - saved state as URL
 */
const createInsight = async (
  name,
  description,
  projectId,
  contextId,
  url,
  image,
  viewState,
  dataState,
  // eslint-disable-next-line camelcase
  annotation_state,
  metadata,
  schemaVersion,
  type,
  view,
  state
) => {
  const newId = uuid();
  Logger.info('Creating insight entry: ' + newId);
  const insightsConnection = Adapter.get(RESOURCE.INSIGHT);
  const keyFn = (doc) => {
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

/**
 * Update an insight with the specified changes
 */
const updateInsight = async (id, insight) => {
  const connection = Adapter.get(RESOURCE.INSIGHT);

  // Create a thumbnail
  if (insight.image) {
    insight.thumbnail = await resizeImage(insight.image, TARGET_THUMBNAIL_WIDTH);
  }

  const result = await connection.update(
    {
      id: id,
      ...insight,
    },
    (d) => d.id
  );
  if (result.errors) {
    throw new Error(JSON.stringify(result.items[0]));
  }
};

/**
 * Returns a list of insights that match a filter
 */
const getAllInsights = async (filterParams, options) => {
  const insightsConnection = Adapter.get(RESOURCE.INSIGHT);
  if (!options.size) {
    options.size = MAX_INSIGHTS;
  }
  const results = await insightsConnection.find(filterParams, options);
  return results;
};

/**
 * Returns an insight matching the id
 */
const getInsight = async (insightId, fieldAllowList) => {
  const insightsConnection = Adapter.get(RESOURCE.INSIGHT);
  const options = {};
  if (fieldAllowList && fieldAllowList.length > 0) {
    options.includes = fieldAllowList;
  }
  const result = await insightsConnection.findOne([{ field: 'id', value: insightId }], options);
  return result;
};

const getInsightThumbnail = async (insightId) => {
  const insight = await getInsight(insightId, ['thumbnail']);
  const uri = insight.thumbnail;
  const data = uri.split(',')[1];
  const buf = Buffer.from(data, 'base64');
  return buf;
};

/**
 * Count the number of insights that math a filter
 */
const count = async (filterParams) => {
  const insightsConnection = Adapter.get(RESOURCE.INSIGHT);
  const count = await insightsConnection.count(filterParams);
  return count;
};

/**
 * Remove specific insight
 *
 * @param {string} insightId - the insight id
 */
const remove = async (insightId) => {
  Logger.info('Deleting insight:' + insightId);
  const insightsConnection = Adapter.get(RESOURCE.INSIGHT);
  const stats = await insightsConnection.remove([{ field: 'id', value: insightId }]);
  Logger.info(`Deleted insight: ${insightId}`);
  return stats;
};

module.exports = {
  createInsight,
  getAllInsights,
  getInsight,
  getInsightThumbnail,
  count,
  remove,
  updateInsight,
};
