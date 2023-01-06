var express = require('express');
var router = express.Router();

/* GET health check. */
router.get('/', function (req, res, next) {
  res.json({
    message: 'World Modeler API',
  });
});

/* GET current health */
router.get('/health', function (req, res, next) {
  res.json({
    status: 'healthy',
  });
});

module.exports = router;
