import express from 'express';
import asyncHandler from 'express-async-handler';
import * as questionService from '#@/services/question-service.js';
import * as authUtil from '#@/util/auth-util.js';

const router = express.Router();

/**
 * POST commit for a question
 */
router.post(
  '/',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const {
      question,
      // modified_at -> automatically added inside the function createQuestion()
      project_id,
      context_id,
      linked_insights,
      view_state,
    } = req.body;
    const result = await questionService.createQuestion(
      question,
      project_id,
      context_id,
      linked_insights,
      view_state
    );
    res.json(result);
  })
);

/**
 * Update a question doc
 */
router.put(
  '/:id',
  authUtil.checkRole([authUtil.ROLES.USER]),
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
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const { project_id, context_id, visibility } = req.body;
    const result = await questionService.getAllQuestions(project_id, context_id, visibility);
    res.json(result);
  })
);

/**
 * GET a count of questions
 **/
router.get(
  '/counts',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const { project_id, context_id } = req.query;
    const result = await questionService.counts(project_id as string, context_id as string);
    res.json(result);
  })
);

/**
 * GET a question by id
 */
router.get(
  '/:id',
  authUtil.checkRole([authUtil.ROLES.USER]),
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
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const questionId = req.params.id;
    const result = await questionService.remove(questionId);
    res.status(200);
    res.json(result);
  })
);

export default router;
