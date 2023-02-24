const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const { Adapter, RESOURCE } = rootRequire('adapters/es/adapter');

/* Keycloak Authentication */
const keycloak = rootRequire('/config/keycloak-config.js').getKeycloak();
const { PERMISSIONS } = rootRequire('/util/auth-util.js');

/* GET knowledge bases */
router.get(
  '/',
  keycloak.enforcer([PERMISSIONS.USER]),
  asyncHandler(async (req, res) => {
    const kb = Adapter.get(RESOURCE.KNOWLEDGE_BASE);
    const { size } = req.query;
    const knowledgeBases = await kb.find({}, { size });
    res.json(knowledgeBases);
  })
);

module.exports = router;
