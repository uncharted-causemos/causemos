const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const { Adapter, RESOURCE } = rootRequire('/adapters/es/adapter');

/**
 * Get bibliographical information for a given CAG
 *
 * Handles up to a "reasonable" 10k of statements
 */
router.get('/cag-bibliography', asyncHandler(async (req, res) => {
  const ids = JSON.parse(req.query.ids);
  const result = {};

  if (!ids || _.isEmpty(ids)) {
    res.json(result);
    return;
  }

  const edgeAdapter = Adapter.get(RESOURCE.EDGE_PARAMETER);
  const modelAdapter = Adapter.get(RESOURCE.MODEL);

  for (const cagId of ids) {
    const cagResult = [];

    // 0. Get CAG
    const model = await modelAdapter.findOne([
      { field: 'id', value: cagId }
    ], {});

    if (model) {
      // 1. Get edges
      const edges = await edgeAdapter.find([
        { field: 'model_id', value: cagId }
      ], { size: 5000 });

      // 2. Get statements
      let statementIds = [];
      for (const edge of edges) {
        statementIds = statementIds.concat(edge.reference_ids);
      }
      statementIds = _.uniq(statementIds);

      // 3. Get document context
      const projectId = model.project_id;
      const statementAdapter = Adapter.get(RESOURCE.STATEMENT, projectId);

      const statements = await statementAdapter.find({
        clauses: [
          { field: 'id', values: statementIds, operand: 'OR', isNot: false }
        ]
      }, { size: 10000, includes: ['id', 'evidence.document_context'] });

      const dupe = new Set();
      for (const statement of statements) {
        for (const evidence of statement.evidence) {
          const doc = evidence.document_context;
          if (!dupe.has(doc.doc_id)) {
            dupe.add(doc.doc_id);
            cagResult.push({
              doc_id: doc.doc_id,
              author: doc.author,
              title: doc.title,
              publisher_name: doc.publisher_name,
              publication_date: doc.publication_date
            });
          }
        }
      }
      result[cagId] = cagResult;
    } else {
      /*
        no cites available, so set an empty array such that
        that anything dependent on cycling through the return
        like exports are doesn't break unexpectedly.
      */
      result[cagId] = [];
    }
  }
  res.json(result);
}));


module.exports = router;
