const moment = require('moment');
const uuid = require('uuid');
const Logger = rootRequire('/config/logger');
const es = rootRequire('adapters/es/adapter');

const Adapter = es.Adapter;
const RESOURCE = es.RESOURCE;

/**
 * Wrapper to create a new bookmark.
 *
 * @param {string} projectId - project id
 * @param {string} title - bookmark title
 * @param {string} description - bookmark description
 * @param {string} url - saved state as URL
 */
const createBookmark = async (projectId, title, description, view, url, thumbnailSource) => {
  const newId = uuid();
  Logger.info('Creating bookmark entry: ' + newId);
  const bookmarksConnection = Adapter.get(RESOURCE.BOOKMARK);
  const keyFn = (doc) => {
    return doc.id;
  };
  await bookmarksConnection.insert({
    id: newId,
    project_id: projectId,
    modified_at: moment().valueOf(),
    title,
    description,
    view,
    url,
    thumbnail_source: thumbnailSource
  }, keyFn);

  // Acknowledge success
  return { id: newId };
};

/**
 * Returns a list of bookmarks
 */
const getAllBookmarks = async (projectId) => {
  const bookmarksConnection = Adapter.get(RESOURCE.BOOKMARK);
  const results = await bookmarksConnection.find([{ field: 'project_id', value: projectId }], { size: 50 });
  return results;
};

/**
 * Count the number of bookmarks within a project
 *
 * @param {string} projectId
 */
const counts = async (projectId) => {
  const bookmarksConnection = Adapter.get(RESOURCE.BOOKMARK);
  const count = await bookmarksConnection.count([{ field: 'project_id', value: projectId }]);
  return count;
};

/**
 * Remove specific bookmark
 *
 * @param {string} bookmarkId - the bookmark id
 */
const remove = async (bookmarkId) => {
  Logger.info('Deleting bookmark:' + bookmarkId);
  const bookmarksConnection = Adapter.get(RESOURCE.BOOKMARK);
  const stats = await bookmarksConnection.remove([{ field: 'id', value: bookmarkId }]);
  Logger.info(`Deleted bookmark: ${bookmarkId}`);
  return stats;
};


module.exports = {
  createBookmark,
  getAllBookmarks,
  counts,
  remove
};
