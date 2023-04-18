const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();

const { Adapter, RESOURCE } = rootRequire('adapters/es/adapter');

/* Keycloak Authentication */
const authUtil = rootRequire('/util/auth-util.js');

const DEFAULT_SIZE = 50;
const MAX_SIZE = 10000;

/* GET all audits */
router.get(
  '/',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const audit = Adapter.get(RESOURCE.AUDIT);
    const from = req.query.from || 0;
    let size = req.query.size || DEFAULT_SIZE;
    size = Math.min(size, MAX_SIZE);

    const sort = { modified_at: 'desc' };
    const searchFilters = [];
    if (req.query.projectId) {
      searchFilters.push({
        field: 'project_id',
        value: req.query.projectId,
      });
    }
    const auditEntries = await audit.find(searchFilters, { from, size, sort });
    res.json(auditEntries);
  })
);

/* GET number of entries */
router.get(
  '/counts',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const audit = Adapter.get(RESOURCE.AUDIT);
    const searchFilters = [];
    if (req.query.projectId) {
      searchFilters.push({
        field: 'project_id',
        value: req.query.projectId,
      });
    }
    const count = await audit.count(searchFilters);
    res.json(count);
  })
);

/* GET export audits */
router.get(
  '/download',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const audit = Adapter.get(RESOURCE.AUDIT);
    const searchFilters = [];

    let fileName = 'audits.json';
    if (req.query.projectId) {
      fileName = `audit_${req.query.projectId}.json`;
      searchFilters.push({
        field: 'project_id',
        value: req.query.projectId,
      });
    }

    // FIXME:Switch to scan in order to extract all entries
    const auditEntries = await audit.find(searchFilters, { size: MAX_SIZE });
    res.setHeader('Content-disposition', `attachment; filename=${fileName}`);
    res.setHeader('Content-type', 'application/octet-stream');
    res.send(auditEntries);
  })
);

module.exports = router;
