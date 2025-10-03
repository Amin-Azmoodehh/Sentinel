import { SentinelMcpServer } from './server/SentinelMcpServer.js';
import { startHttpServer } from './HttpServer.js';
import { startSseServer } from './SseServer.js';

let server: SentinelMcpServer | null = null;

const getInstance = (): SentinelMcpServer => {
  if (!server) {
    server = new SentinelMcpServer();
  }
  return server;
};

export const runStdioServer = async (): Promise<void> => {
  const instance = getInstance();
  await instance.start();
};

export const runHttpServer = (port: number): void => {
  const instance = getInstance();
  startHttpServer(instance, port);
};

export const runSseServer = (port: number): void => {
  startSseServer(port);
};

export const stopServer = async (): Promise<void> => {
  if (server) {
    await server.stop();
    server = null;
  }
};
