const _ = require('lodash');
const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const { RESOURCE } = require('#@/adapters/es/adapter.js');
const { client } = require('#@/adapters/es/client.js');

/* Keycloak Authentication */
const authUtil = require('#@/util/auth-util.js');

/* GET server settings */
router.get(
  '/',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const now = Date.now();
    const cutoff = now - 2 * 24 * 60 * 60 * 1000;

    console.log(`From ${new Date(cutoff)} to ${new Date(now)}`);

    const response = await client.search({
      index: RESOURCE.SESSION_LOG,
      size: 10000,
      scroll: '2m',
      body: {
        query: {
          range: {
            timestamp: {
              gte: cutoff,
            },
          },
        },
      },
    });

    const responseQueue = [];
    const entries = [];
    responseQueue.push(response);

    while (responseQueue.length) {
      const { body } = responseQueue.shift();
      const docs = body.hits.hits.map((d) => d._source);
      console.log(`process batch size=${docs.length}`);

      if (docs.length === 0) break;

      for (const doc of docs) {
        // Remove spams
        if (
          doc.request_path.includes('recalculate') ||
          doc.request_path.includes('spanning-bbox') ||
          doc.request_path.includes('questions/search') ||
          doc.request_method === 'GET'
        )
          continue;

        entries.push(doc);
      }

      // Get the next response if there are more quotes to fetch
      responseQueue.push(
        await client.scroll({
          scrollId: body._scroll_id,
          scroll: '2m',
        })
      );
    }

    console.log(`return entries length=${entries.length}`);
    const sessions = _.groupBy(entries, 'session');

    const keys = Object.keys(sessions);

    // Divide into 30 minutes intervals
    const mod30min = 30 * 60 * 1000;
    for (const key of keys) {
      const entries = sessions[key];
      for (const e of entries) {
        e.timestamp = new Date(e.timestamp - (e.timestamp % mod30min));
        delete e.parameters;
        delete e.session;
      }

      // Group
      const groupedEntries = _.groupBy(entries, 'timestamp');
      sessions[key] = groupedEntries;
    }

    res.json(sessions);
  })
);

module.exports = router;
