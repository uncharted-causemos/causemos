const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();
const Logger = rootRequire('/config/logger');
const projectService = rootRequire('/services/project-service');

const dartService = rootRequire('/services/external/dart-service');

/* Keycloak Authentication */
const keycloak = rootRequire('/config/keycloak-config.js').getKeycloak();
const { PERMISSIONS } = rootRequire('/util/auth-util.js');

/**
 * GET DART document from the docker service used for managing dart documents
 *
 * Note: This endpoint is meant to be used for fetching the document
 * from the dart service and sending it back in the original request.
 */
router.get(
  '/:docId/raw',
  keycloak.enforcer([PERMISSIONS.USER]),
  asyncHandler(async (req, res, next) => {
    const docId = req.params.docId;
    const docStream = await dartService.getRawDoc(docId);
    docStream.on('error', (error) => {
      console.error(error);
      return next(new Error('Failed to fetch raw PDF'));
    });
    docStream.pipe(res);
  })
);

/**
 * Upload a set of documents
 */
router.post(
  '/corpus',
  keycloak.enforcer([PERMISSIONS.USER]),
  upload.array('file'),
  [],
  asyncHandler(async (req, res) => {
    let metadata = req.body.metadata;
    metadata = JSON.parse(metadata);
    const projectId = req.body.project;

    const project = await projectService.findProject(projectId);

    // Tenant information
    if (project.corpus_id === 'august_embed_ata') {
      metadata.tenants = ['ata'];
    } else if (project.corpus_id === 'august_embed_ata_v2') {
      metadata.tenants = ['ata'];
    } else if (project.corpus_id === 'august_embed_new-america') {
      metadata.tenants = ['new-america'];
    } else if (project.corpus_id === 'august_embed_new-america_v2') {
      metadata.tenants = ['new-america'];
    } else {
      metadata.tenants = [project.tenant_id];
    }

    Logger.info(JSON.stringify(metadata));

    if (_.isEmpty(metadata.tenants)) {
      throw new Error(`Unable to find tenants for ${project.corpus_id}`);
    }

    Logger.info(`Extending project: ${projectId}`);
    const results = [];
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];

      let r = null;
      try {
        r = await dartService.uploadDocument(file, JSON.stringify(metadata));
      } catch (err) {
        console.log(err);
      }
      console.log(r);
      const documentId = JSON.parse(r).document_id;
      Logger.info(`\t${i} ${file.originalname} ${documentId}`);
      results.push({
        document_id: documentId,
        name: file.originalname,
      });
    }

    // Write to project-extension
    await projectService.extendProject(projectId, results);
    res.json(results);
  })
);

router.get(
  '/readers-status',
  keycloak.enforcer([PERMISSIONS.USER]),
  asyncHandler(async (req, res, next) => {
    const timestamp = req.query.timestamp || 0;

    try {
      const result = await dartService.queryReadersStatus(timestamp);
      res.json(JSON.parse(result));
    } catch (err) {
      res.json({
        records: [
          {
            identity: 'eidos',
            version: '1.1.0',
            document_id: '0a6200447248b0bfb4a67d0fb5e84cbd',
            storage_key: 'fa318773-2b58-4a32-8891-ae548551b022.jsonld',
          },
          {
            identity: 'eidos',
            version: '1.1.0',
            document_id: '2abf581c664923ed83f25c17fe1ddd50',
            storage_key: '0e0f6e1f-49b8-446d-b15c-77ee433c324a.jsonld',
          },
          {
            identity: 'eidos',
            version: '1.1.0',
            document_id: '2bb0fd1f905675cd7a99a0d900bc1981',
            storage_key: 'b5712f59-80b7-470a-be6e-9b4d7fc652c4.jsonld',
          },
        ],
      });
    }
  })
);

module.exports = router;
