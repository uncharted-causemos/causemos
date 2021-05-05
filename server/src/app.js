const path = require('path');

const dotenvConfigResult = require('dotenv').config(); // This line of code reads the contents of the .env file in root into the process.env file.

global.rootRequire = function(name) {
  return require(path.join(__dirname, name));
};

const createError = require('http-errors');
const proxy = require('express-http-proxy');
const express = require('express');
const session = require('express-session');
// const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const Logger = rootRequire('/config/logger');
const serverConfiguration = rootRequire('/config/yargs-wrapper');

const nocache = require('nocache');

const indexRouter = rootRequire('/routes/index');
const auditsRouter = rootRequire('/routes/audits');
const modelsRouter = rootRequire('/routes/models');
const analysesRouter = rootRequire('/routes/analyses');
// const evidencesRouter = rootRequire('/routes/evidences');
const documentsRouter = rootRequire('/routes/documents');
const scenariosRouter = rootRequire('/routes/scenario');
const settingsRouter = rootRequire('/routes/settings');
const dartRouter = rootRequire('/routes/dart');
const bookmarksRouter = rootRequire('/routes/bookmarks');
const cagsRouter = rootRequire('/routes/cags');
const curationRecommendationsRouter = rootRequire('/routes/curation-recommendations');
const modelRunRouter = rootRequire('/routes/model-run');
const maasRouter = rootRequire('/routes/maas');
const fetchFileService = rootRequire('/services/external/fetch-file-service');
const asyncHandler = require('express-async-handler');

const kbsRouter = rootRequire('/routes/knowledge-bases');
const projectsRouter = rootRequire('/routes/projects');

const sessionLogService = rootRequire('/services/session-log-service');

// Proxy to serve carto tiles with Uncharted license key
const mapProxyRouter = rootRequire('/routes/map-proxy');

const compression = require('compression');
const app = express();

// This code block is for handling issues with setting up the .env file for environment variables.
if (dotenvConfigResult.error) {
  Logger.warn('No .env file found or has initialization errors - will use default environment');
}

// TODO: selectively add cache busting header for performance
app.use(nocache());
app.use(compression());
app.use(morgan('dev', {
  stream: { write: message => Logger.info(message.trim()) },
  skip: function(req, res) {
    if (req.path === '/health') return true;
    return false;
  }
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: false }));

// app.use(cookieParser());
app.use(session({
  secret: 'correcthorsebatterystable',
  resave: false,
  saveUninitialized: true
}));

app.use(express.static(path.join(__dirname, '../public')));

// This is more like a health check
app.use('/', indexRouter);


// session logger
app.use(function(req, res, next) {
  sessionLogService.logRequest(req);
  next();
});

app.use('/api', [
  settingsRouter
]);

app.use('/api/dart', [
  dartRouter
]);

app.use('/api/bookmarks', [
  bookmarksRouter
]);

// The routes here are for model parameterization and model-based experiments
app.use('/api/models', [
  modelsRouter
]);

app.use('/api/analyses', [
  analysesRouter
]);

app.use('/api/scenarios', [
  scenariosRouter
]);

// Routes for fetching document
app.use('/api/documents', [
  documentsRouter
]);

// The routes here are for the CAG requests
app.use('/api/cags', [
  cagsRouter
]);

// Routes for project auditing
app.use('/api/audits', [
  auditsRouter
]);

// Handle some /api/mass/* calls ourselves. The rest get handled below.
app.use('/api/maas', [
  maasRouter
]);

// Forward /api/maas/* to WM_GO_URL/maas/*
app.use('/api/maas', proxy(process.env.WM_GO_URL, { proxyReqPathResolver: req => '/maas' + req.url }));

app.use('/api/map', [
  mapProxyRouter
]);


app.use('/api/curation_recommendations', [
  curationRecommendationsRouter
]);

app.use('/api/model-run', [
  modelRunRouter
]);

app.use('/api/fetch-demo-data', asyncHandler(async (req, res) => {
  const modelId = req.query.modelId;
  const runId = req.query.runId;
  const type = req.query.type;

  try {
    const result = await fetchFileService.fetchDemoData(modelId, runId, type);
    res.status(200).json(result || {});
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal request returned: ' + err.message);
  }
}));

app.use('/api/projects', projectsRouter);
app.use('/api/kbs', kbsRouter);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});


// error handler
app.use(function(err, req, res, next) {
  console.log('ERROR', JSON.stringify(err));
  Logger.error(err);

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.send({ err: err.message || 'Server error' });
});

// Log server configuration
Logger.info(`Server Configuration: ${JSON.stringify(serverConfiguration, null, 4)}`);

module.exports = app;
