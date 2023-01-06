const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();

const questionService = rootRequire('/services/question-service');

/**
 * POST commit for an question
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const {
      question,
      description,
      // modified_at -> automatically added inside the function createQuestion()
      visibility,
      project_id,
      analysis_id,
      context_id,
      url,
      target_view,
      pre_actions,
      post_actions,
      linked_insights,
      view_state,
    } = req.body;
    const result = await questionService.createQuestion(
      question,
      description,
      visibility,
      project_id,
      analysis_id,
      context_id,
      url,
      target_view,
      pre_actions,
      post_actions,
      linked_insights,
      view_state
    );
    res.json(result);
  })
);

/**
 * Update an question doc
 */
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const questionId = req.params.id;
    const question = req.body;
    question.id = question.id || questionId;
    await questionService.updateQuestion(questionId, question);
    res.status(200).send({ updated: 'success' });
  })
);

/**
 * POST search for a list of questions
 */
router.post(
  '/search',
  asyncHandler(async (req, res) => {
    const { project_id, context_id, target_view, visibility } = req.body;
    const result = await questionService.getAllQuestions(
      project_id,
      context_id,
      target_view,
      visibility
    );
    res.json(result);
  })
);

/**
 * GET a count of questions
 **/
router.get(
  '/counts',
  asyncHandler(async (req, res) => {
    const { project_id, context_id, target_view, visibility } = req.query;
    const result = await questionService.counts(project_id, context_id, target_view, visibility);
    res.json(result);
  })
);

/**
 * GET an question by id
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const questionId = req.params.id;
    const result = await questionService.getQuestion(questionId);
    res.status(200);
    res.json(result);
  })
);

/**
 * DELETE existing question
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const questionId = req.params.id;
    const result = await questionService.remove(questionId);
    res.status(200);
    res.json(result);
  })
);

module.exports = router;
