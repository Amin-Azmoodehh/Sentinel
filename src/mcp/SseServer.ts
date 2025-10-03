import http from 'node:http';
import { log } from '../utils/logger.js';

let clients: http.ServerResponse[] = [];

export const startSseServer = (port: number): void => {
  const sseServer = http.createServer((req, res) => {
    if (req.url === '/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      res.write('\n');

      clients.push(res);
      log.info(`[SSE] Client connected. Total clients: ${clients.length}`);

      req.on('close', () => {
        clients = clients.filter((client) => client !== res);
        log.info(`[SSE] Client disconnected. Total clients: ${clients.length}`);
      });
    } else {
      res.writeHead(404).end();
    }
  });

  sseServer.listen(port, () => {
    log.success(`🚀 SentinelTM SSE Server listening on http://localhost:${port}`);
  });
};

export const broadcastSseEvent = (eventName: string, data: unknown): void => {
  const message = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach((client) => {
    try {
      client.write(message);
    } catch (error) {
      log.error(`[SSE] Failed to write to a client: ${error}`);
    }
  });
};
