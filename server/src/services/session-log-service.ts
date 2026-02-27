import { v4 as uuid } from 'uuid';
import Logger from '#@/config/logger.js';
import { Adapter, RESOURCE } from '#@/adapters/es/adapter.js';
import type { Request } from 'express';

const sessionLogAdapter = Adapter.get(RESOURCE.SESSION_LOG);
let buffer: any[] = [];
let timeId: ReturnType<typeof setTimeout> | null = null;

/**
 * @param {object} req - request object
 */
export const logRequest = async (req: Request) => {
  let parameters = null;

  // Don't self log
  if (req.path.includes('session-log')) return;

  // Only know how to parse GET requests for sure
  if (req.method === 'GET') {
    if ((req.query as any).filters) parameters = JSON.parse((req.query as any).filters);
    else if ((req.query as any).filter) parameters = JSON.parse((req.query as any).filter);
    else parameters = [];
  }

  buffer.push({
    session: (req as any).sessionID,
    timestamp: Date.now(),
    request_path: req.path,
    request_method: req.method,
    parameters: parameters,
  });

  // Buffer up the logs so we don't put too much strain, wait 30 seconds before flushing to datastore
  if (!timeId) {
    timeId = setTimeout(() => {
      try {
        Logger.info(`Flushing ${buffer.length} session activity entries`);
        sessionLogAdapter.insert(buffer, () => uuid());
      } catch (err) {
        Logger.warn(err);
      } finally {
        buffer = [];
        timeId = null;
      }
    }, 45000);
  }
};
