import { SentinelMcpServer } from './SentinelMcpServer.js';
import { log } from '../../utils/logger.js';

export { SentinelMcpServer };

export async function runMcpServer(): Promise<void> {
  const server = new SentinelMcpServer();
  await server.start();
  log.info('SentinelTM MCP server started successfully');

  return new Promise((resolve) => {
    process.on('SIGINT', async () => {
      await server.stop();
      resolve();
    });
  });
}
