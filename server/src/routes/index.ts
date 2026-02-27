import express from 'express';

const router = express.Router();

/* GET health check. */
router.get('/', function (req, res) {
  res.json({
    message: 'World Modeler API',
  });
});

/* GET current health */
router.get('/health', function (req, res) {
  res.json({
    status: 'healthy',
  });
});

export default router;
