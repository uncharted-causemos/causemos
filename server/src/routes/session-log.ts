import _ from 'lodash';
import express from 'express';
import asyncHandler from 'express-async-handler';
import { RESOURCE } from '#@/adapters/es/adapter.js';
import { client } from '#@/adapters/es/client.js';
import * as authUtil from '#@/util/auth-util.js';

const router = express.Router();

/* GET session log entries */
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
    } as any);

    const responseQueue: any[] = [];
    const entries: any[] = [];
    responseQueue.push(response);

    while (responseQueue.length) {
      const { body } = responseQueue.shift() as any;
      const docs = body.hits.hits.map((d: any) => d._source);
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
        } as any)
      );
    }

    console.log(`return entries length=${entries.length}`);
    const sessions: Record<string, any> = _.groupBy(entries, 'session');

    const keys = Object.keys(sessions);

    // Divide into 30 minutes intervals
    const mod30min = 30 * 60 * 1000;
    for (const key of keys) {
      const sessionEntries = sessions[key];
      for (const e of sessionEntries) {
        e.timestamp = new Date(e.timestamp - (e.timestamp % mod30min));
        delete e.parameters;
        delete e.session;
      }

      // Group
      const groupedEntries = _.groupBy(sessionEntries, 'timestamp');
      sessions[key] = groupedEntries;
    }

    res.json(sessions);
  })
);

export default router;
