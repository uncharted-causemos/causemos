import path from 'path';

const dotenvConfigResult = require('dotenv').config(); // This line of code reads the contents of the .env file in root into the process.env variable.

import createError from 'http-errors';
import proxy from 'express-http-proxy';
import express from 'express';
import session from 'express-session';
// import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import nocache from 'nocache';
import compression from 'compression';
import axios from 'axios';
import { expressjwt as jwt } from 'express-jwt';
import asyncHandler from 'express-async-handler';

import Logger from '#@/config/logger.js';
import argv from '#@/config/yargs-wrapper.js';

import indexRouter from '#@/routes/index.js';
import analysesRouter from '#@/routes/analyses.js';
import settingsRouter from '#@/routes/settings.js';
import insightsRouter from '#@/routes/insights.js';
import questionsRouter from '#@/routes/questions.js';
import modelRunsRouter from '#@/routes/model-runs.js';
import modelRunTagsRouter from '#@/routes/model-run-tags.js';
import indicatorsRouter from '#@/routes/indicators.js';
import datacubeRouter from '#@/routes/datacubes.js';
import gadmRouter from '#@/routes/gadm.js';
import pipelineReportingRouter from '#@/routes/pipeline-reporting.js';
import sessionLogRouter from '#@/routes/session-log.js';
import keycloakRouter from '#@/routes/keycloak.js';
import projectsRouter from '#@/routes/projects.js';
import DomainProjectsRouter from '#@/routes/domain-projects.js';
import { logRequest } from '#@/services/session-log-service.js';
import { getFlowLogs } from '#@/services/external/prefect-queue-service.js';
import mapProxyRouter from '#@/routes/map-proxy.js';
import jatawareParagraphsRouter from '#@/routes/jataware-paragraphs.js';
import jatawareDocumentsRouter from '#@/routes/jataware-documents.js';
import jatawareFeaturesRouter from '#@/routes/jataware-features.js';
import jatawareRecommenderRouter from '#@/routes/jataware-recommender.js';

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
    stream: { write: (message: string) => Logger.info(message.trim()) },
    skip: function (req, _res) {
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
  logRequest(req);
  next();
});

let publicKey = '';
// Fetch Keycloak public key asynchronously at startup
(async () => {
  try {
    const resp = await axios.get(`${process.env.KC_FQDN}/realms/${process.env.KC_REALM}`);
    publicKey = `-----BEGIN PUBLIC KEY-----\r\n${resp.data.public_key}\r\n-----END PUBLIC KEY-----`;
  } catch (e) {
    Logger.error('Failed to fetch Keycloak public key. JWT validation will be disabled or fail.');
    Logger.error(e);
  }
})();

app.use(
  jwt({
    secret: (_req, _token) => {
      if (!publicKey) throw new Error('Public key not initialized');
      return publicKey;
    },
    algorithms: ['RS256'],
  }).unless({
    path: [
      // Keycloak endpoints are accessed without token
      { url: /\/api\/keycloak\/.+/, methods: ['GET'] },
      // This endpoint is accessed by the `src` attribute on an `img` element
      //  in the frontend. Those requests do not have any keycloak auth
      //  information, so we don't check for a valid Keycloak bearer token.
      { url: /\/api\/insights\/.+\/thumbnail/, methods: ['GET'] },

      // These endpoints are accessed by scripts and Jataware using basic auth
      //  so we don't check for a valid Keycloak bearer token.
      { url: '/api/maas/datacubes', methods: ['POST'] },
      { url: /\/api\/maas\/datacubes\/.+/, methods: ['PUT'] },
      { url: /\/api\/maas\/datacubes\/.+\/deprecate/, methods: ['PUT'] },

      { url: '/api/maas/model-runs', methods: ['POST'] },
      { url: /\/api\/maas\/model-runs\/.+\/post-process/, methods: ['POST'] },
      { url: /\/api\/maas\/model-runs\/.+\/run-failed/, methods: ['POST'] },

      { url: '/api/maas/indicators/post-process', methods: ['POST'] },

      // These end points are called by wm-queue without the keycloak auth token
      { url: /\/api\/maas\/pipeline-reporting\/.+/, methods: ['PUT'] },
    ],
  })
);

app.use('/api', [settingsRouter]);

app.use('/api/keycloak', [keycloakRouter]);

app.use('/api/insights', [insightsRouter]);

app.use('/api/questions', [questionsRouter]);

// The routes here are for model parameterization and model-based experiments
app.use('/api/analyses', [analysesRouter]);

// Handle some /api/maas calls ourselves. The rest get handled below.
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
  proxy(process.env.WM_GO_URL as string, {
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
  proxy(process.env.WM_GO_URL as string, {
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

app.use(
  '/api/url-to-b64',
  asyncHandler(async (req, res) => {
    const fileUrl = req.query.url as string;
    Logger.info(`Fetching ${fileUrl} as base64`);

    try {
      const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
      const b64Str = Buffer.from(response.data).toString('base64');
      res.status(200).send(b64Str);
    } catch (err: any) {
      console.log(err);
      res.status(500).send('Internal request returned: ' + err.message);
    }
  })
);

app.use(
  '/api/prefect-flow-logs',
  asyncHandler(async (req, res) => {
    try {
      const result = await getFlowLogs(req.query.flowId as string);
      res.status(200).json(result || {});
    } catch (err: any) {
      console.log(err);
      res.status(500).send('Internal request returned: ' + err.message);
    }
  })
);

app.use('/api/projects', projectsRouter);

app.use('/api/domain-projects', DomainProjectsRouter);

app.use('/api/dojo/paragraphs', [jatawareParagraphsRouter]);
app.use('/api/dojo/documents', [jatawareDocumentsRouter]);
app.use('/api/dojo/features', [jatawareFeaturesRouter]);
app.use('/api/dojo/causal-recommender', [jatawareRecommenderRouter]);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (
  err: any,
  req: express.Request,
  res: express.Response,
  _next: express.NextFunction
) {
  Logger.error(err);

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.send({ err: err.message || 'Server error' });
});

export default app;
