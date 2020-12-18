const _ = require('lodash');
const moment = require('moment');
const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();

const convertUtil = rootRequire('/util/convert-util');
const indraService = rootRequire('/services/external/indra-service');
const updateService = rootRequire('/services/update-service');
const collectionService = rootRequire('/services/collection-service');

/*
 * Create a new staging statement(s) from text
 */
router.post('/:collection/evidences', asyncHandler(async (req, res) => {
  // Supported Readers
  const collectionId = req.params.collection;
  const text = req.body.text;
  const reader = req.body.reader.toLowerCase();

  // 1) Check if new text and correct reader is specified
  if (_.isNil(text)) {
    res.json({ error: 'Text cannot be empty' });
    res.sendStatus(500);
  }
  if (_.isNil(reader)) {
    res.json({ error: 'Reader cannot be empty' });
    res.sendStatus(500);
  }
  try {
    // TODO: Support for other readers
    // if (reader !== 'eidos') {
    //   statements = await indraService.mapToUnOntology(statements);
    // }
    const statements = await indraService.createNewIndraStatements(text, reader);
    const newStatements = convertUtil.convertFromIndras(statements);

    const audits = newStatements.map(statement => {
      return {
        update_type: 'new',
        update_token: moment().valueOf(),
        prev_values: {},
        new_values: statement,
        readers: statement.readers,
        statement_id: statement.id,
        created_at: moment().valueOf()
      };
    });
    updateService.insertAudit(collectionId, audits);
    // 2) Save statement into mongo, with staging status
    const evidences = convertUtil.processEvidence(statements);
    await collectionService.addEvidence(evidences);
    const numStatements = await collectionService.addStatements(collectionId, newStatements);
    res.json({ numNewStatements: numStatements });
  } catch (err) {
    res.status(500);
    res.send(err);
  }
}));

/*
 * Merge staging statements to Knowledgebase
 */
router.post('/:collection/evidences/merge-staging', asyncHandler(async (req, res) => {
  const collection = req.params.collection;
  const token = await updateService.mergeStaging(collection);
  res.json({
    updateToken: token
  });
}));

/*
 * Count number of staging statements
 */
router.get('/:collection/evidences/count', asyncHandler(async (req, res) => {
  const collection = req.params.collection;
  const count = await collectionService.getStagedStatementCounts(collection);
  res.json(count);
}));

module.exports = router;
