
const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();

const bookmarkService = rootRequire('/services/bookmark-service');

/**
 * POST commit for a bookmark
 */
router.post('/', asyncHandler(async (req, res) => {
  const {
    project_id,
    title,
    description,
    view,
    url,
    thumbnailSource
  } = req.body;
  const result = await bookmarkService.createBookmark(project_id, title, description, view, url, thumbnailSource);
  res.json(result);
}));

/**
 * GET a list of bookmarks
 */
router.get('/', asyncHandler(async (req, res) => {
  const { project_id } = req.query;
  const result = await bookmarkService.getAllBookmarks(project_id);
  res.json(result);
}));


/**
 * GET a count of bookmarks
 **/
router.get('/counts', asyncHandler(async (req, res) => {
  const { project_id: projectId } = req.query;
  const result = await bookmarkService.counts(projectId);
  res.json(result);
}));

/**
 * DELETE existing bookmark
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const bookmarkId = req.params.id;
  const result = await bookmarkService.remove(bookmarkId);
  res.status(200);
  res.json(result);
}));

module.exports = router;
