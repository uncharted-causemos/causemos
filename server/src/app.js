const path = require('path');

const dotenvConfigResult = require('dotenv').config(); // This line of code reads the contents of the .env file in root into the process.env variable.

const createError = require('http-errors');
const proxy = require('express-http-proxy');
const express = require('express');
const session = require('express-session');
// const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const nocache = require('nocache');
const compression = require('compression');

// Authentication
const request = require('sync-request');
var { expressjwt: jwt } = require('express-jwt');

const Logger = require('#@/config/logger.js');
const argv = require('#@/config/yargs-wrapper.js');

const indexRouter = require('#@/routes/index.js');
const auditsRouter = require('#@/routes/audits.js');
const modelsRouter = require('#@/routes/models.js');
const analysesRouter = require('#@/routes/analyses.js');
const documentsRouter = require('#@/routes/documents.js');
const scenariosRouter = require('#@/routes/scenario.js');
const scenarioResultsRouter = require('#@/routes/scenario-results.js');
const settingsRouter = require('#@/routes/settings.js');
const dartRouter = require('#@/routes/dart.js');
const insightsRouter = require('#@/routes/insights.js');
const questionsRouter = require('#@/routes/questions.js');
const cagsRouter = require('#@/routes/cags.js');
const curationRecommendationsRouter = require('#@/routes/curation-recommendations.js');
const modelRunsRouter = require('#@/routes/model-runs.js');
const modelRunTagsRouter = require('#@/routes/model-run-tags.js');
const indicatorsRouter = require('#@/routes/indicators.js');
const datacubeRouter = require('#@/routes/datacubes.js');
const gadmRouter = require('#@/routes/gadm.js');
const pipelineReportingRouter = require('#@/routes/pipeline-reporting.js');
const bibliographyRouter = require('#@/routes/bibliography.js');
const sessionLogRouter = require('#@/routes/session-log.js');
const asyncHandler = require('express-async-handler');

const kbsRouter = require('#@/routes/knowledge-bases.js');
const projectsRouter = require('#@/routes/projects.js');
const DomainProjectsRouter = require('#@/routes/domain-projects.js');

const sessionLogService = require('#@/services/session-log-service.js');
const { getFlowLogs } = require('#@/services/external/prefect-queue-service.js');

// Proxy to serve carto tiles with Uncharted license key
const mapProxyRouter = require('#@/routes/map-proxy.js');

const jatawareParagraphsRouter = require('#@/routes/jataware-paragraphs.js');
const jatawareDocumentsRouter = require('#@/routes/jataware-documents.js');
const jatawareFeaturesRouter = require('#@/routes/jataware-features.js');
const jatawareRecommenderRouter = require('#@/routes/jataware-recommender.js');

const requestAsPromise = require('#@/util/request-as-promise.js');

const app = express();

// This code block is for handling issues with setting up the .env file for environment variables.
if (dotenvConfigResult.error) {
  Logger.warn('No .env file found or has initialization errors - will use default environment');
}

// TODO: selectively add cache busting header for performance
app.use(nocache());
app.use(compression());

const prodFormat = ':method :url :status :response-time ms - :res[content-length]';
const morganFormat = argv.morganFormat || prodFormat;
app.use(
  morgan(morganFormat, {
    stream: { write: (message) => Logger.info(message.trim()) },
    skip: function (req, res) {
      if (req.path === '/health') return true;
      return false;
    },
  })
);
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: false }));

// app.use(cookieParser());
app.use(
  session({
    secret: 'correcthorsebatterystable',
    resave: false,
    saveUninitialized: true,
  })
);

app.use(express.static(path.join(__dirname, '../public')));

// This is more like a health check
app.use('/', indexRouter);

// session logger
app.use(function (req, res, next) {
  sessionLogService.logRequest(req);
  next();
});

const res = request('GET', `${process.env.KC_FQDN}/realms/causemos`);
const response = JSON.parse(res.getBody().toString());
const publicKey = `-----BEGIN PUBLIC KEY-----\r\n${response.public_key}\r\n-----END PUBLIC KEY-----`;
app.use(jwt({ secret: publicKey, algorithms: ['RS256'] }));

app.use('/api', [settingsRouter]);

app.use('/api/dart', [dartRouter]);

app.use('/api/insights', [insightsRouter]);

app.use('/api/questions', [questionsRouter]);

// The routes here are for model parameterization and model-based experiments
app.use('/api/models', [modelsRouter]);

app.use('/api/analyses', [analysesRouter]);

app.use('/api/scenarios', [scenariosRouter]);

app.use('/api/scenario-results', [scenarioResultsRouter]);

// Routes for fetching document
app.use('/api/documents', [documentsRouter]);

// The routes here are for the CAG requests
app.use('/api/cags', [cagsRouter]);

// Routes for project auditing
app.use('/api/audits', [auditsRouter]);

// Handle some /api/mass calls ourselves. The rest get handled below.
app.use('/api/maas/model-runs', [modelRunsRouter]);

app.use('/api/maas/model-run-tags', [modelRunTagsRouter]);

app.use('/api/maas/indicators', [indicatorsRouter]);

app.use('/api/maas/datacubes', [datacubeRouter]);

app.use('/api/maas/pipeline-reporting', [pipelineReportingRouter]);

app.use('/api/gadm', [gadmRouter]);

app.use('/api/session-log', [sessionLogRouter]);

// Forward /api/maas/output/* to WM_GO_URL/maas/output/*
// Forward /api/maas/tiles/* to WM_GO_URL/maas/tiles/*
app.use(
  '/api/maas/output',
  proxy(process.env.WM_GO_URL, {
    proxyReqPathResolver: (req) => '/maas/output' + req.url,
    userResDecorator: function (proxyRes, proxyResData, userReq, userRes) {
      userRes.removeHeader('expires');
      userRes.removeHeader('pragma');
      userRes.set('Cache-control', 'max-age=86400');
      return proxyResData;
    },
  })
);
app.use(
  '/api/maas/tiles',
  proxy(process.env.WM_GO_URL, {
    proxyReqPathResolver: (req) => '/maas/tiles' + req.url,
    userResDecorator: function (proxyRes, proxyResData, userReq, userRes) {
      userRes.removeHeader('expires');
      userRes.removeHeader('pragma');
      userRes.set('Cache-control', 'max-age=86400');
      return proxyResData;
    },
  })
);

app.use('/api/map', [mapProxyRouter]);

app.use('/api/curation_recommendations', [curationRecommendationsRouter]);

app.use(
  '/api/url-to-b64',
  asyncHandler(async (req, res) => {
    const fileUrl = req.query.url;
    Logger.info(`Fetching ${fileUrl} as base64`);

    try {
      const response = await requestAsPromise({
        method: 'GET',
        url: fileUrl,
        encoding: 'binary',
      });
      const b64Str = Buffer.from(response, 'binary').toString('base64');
      res.status(200).send(b64Str);
    } catch (err) {
      console.log(err);
      res.status(500).send('Internal request returned: ' + err.message);
    }
  })
);

app.use(
  '/api/prefect-flow-logs',
  asyncHandler(async (req, res) => {
    try {
      const result = await getFlowLogs(req.query.flowId);
      res.status(200).json(result || {});
    } catch (err) {
      console.log(err);
      res.status(500).send('Internal request returned: ' + err.message);
    }
  })
);

app.use('/api/projects', projectsRouter);
app.use('/api/kbs', kbsRouter);

app.use('/api/domain-projects', DomainProjectsRouter);

app.use('/api/bibliography', bibliographyRouter);

app.use('/api/dojo/paragraphs', [jatawareParagraphsRouter]);
app.use('/api/dojo/documents', [jatawareDocumentsRouter]);
app.use('/api/dojo/features', [jatawareFeaturesRouter]);
app.use('/api/dojo/causal-recommender', [jatawareRecommenderRouter]);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  Logger.error(err);

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.send({ err: err.message || 'Server error' });
});

// Log server configuration

module.exports = app;
