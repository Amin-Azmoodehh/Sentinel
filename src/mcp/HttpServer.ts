import http from 'node:http';
import { log } from '../utils/logger.js';
import { SentinelMcpServer } from './server/SentinelMcpServer.js';

export const startHttpServer = (server: SentinelMcpServer, port: number): void => {
  const httpServer = http.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/mcp') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const request = JSON.parse(body);
          const responsePayload = await server.handleHttpRequest(request);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(responsePayload));
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    }
  });

  httpServer.listen(port, () => {
    log.success(`🚀 SentinelTM HTTP Server listening on http://localhost:${port}`);
  });
};
