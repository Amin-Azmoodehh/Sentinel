import * as fsService from '../../services/fsService.js';
import {
  ensureString,
  ensureStringArray,
  ensureNumber,
  ensureBoolean,
  ensureObject,
  ensureEncoding,
} from '../validation.js';
import { McpResponse, McpError } from '../types.js';
import { successResponse } from '../utils.js';

const FS_ACTIONS = ['list', 'move', 'copy', 'remove', 'split', 'mkdir'] as const;
type FsAction = (typeof FS_ACTIONS)[number];

export class FsHandler {
  async handleFsTool(args: Record<string, unknown>): Promise<McpResponse> {
    const action = ensureString(args.action, 'action') as FsAction;
    if (!FS_ACTIONS.includes(action)) {
      throw new McpError('Unsupported fs action: ' + action);
    }
    const payload = args.payload ? ensureObject(args.payload, 'payload') : {};

    switch (action) {
      case 'list': {
        const pattern = payload.pattern !== undefined ? ensureString(payload.pattern, 'payload.pattern') : undefined;
        const targetPath = payload.path !== undefined ? ensureString(payload.path, 'payload.path') : undefined;
        const result = await fsService.listFiles(pattern, targetPath);
        return successResponse(result);
      }
      case 'move': {
        const source = ensureString(payload.source, 'payload.source');
        const destination = ensureString(payload.destination, 'payload.destination');
        await fsService.movePath(source, destination);
        return successResponse({ source, destination });
      }
      case 'copy': {
        const source = ensureString(payload.source, 'payload.source');
        const destination = ensureString(payload.destination, 'payload.destination');
        await fsService.copyPath(source, destination);
        return successResponse({ source, destination });
      }
      case 'remove': {
        const target = ensureString(payload.target, 'payload.target');
        const force = payload.force === true;
        await fsService.removePath(target, force);
        return successResponse({ target, removed: true });
      }
      case 'split': {
        const filePath = ensureString(payload.filePath, 'payload.filePath');
        const maxLines = this.asOptionalNumber(payload.maxLines, 'payload.maxLines');
        const summary = fsService.splitLargeFile(filePath, maxLines);
        return successResponse({ summary });
      }
      case 'mkdir': {
        const paths = ensureStringArray(payload.paths, 'payload.paths');
        const result = await fsService.createDirectories(paths);
        return successResponse(result);
      }
      default:
        throw new McpError('Unhandled fs action: ' + action);
    }
  }

  private async handleFileReadTool(args: Record<string, unknown>): Promise<McpResponse> {
    const targetPath = ensureString(args.path, 'path');
    const encoding =
      args.encoding !== undefined ? ensureEncoding(args.encoding, 'encoding') : 'utf8';
    const maxBytes =
      args.maxBytes !== undefined ? ensureNumber(args.maxBytes, 'maxBytes') : undefined;
    const result = fsService.readFileContent(targetPath, { encoding, maxBytes });
    return successResponse(result);
  }

  private async handleFileWriteTool(args: Record<string, unknown>): Promise<McpResponse> {
    const targetPath = ensureString(args.path, 'path');
    const content = ensureString(args.content, 'content', true);
    const encoding =
      args.encoding !== undefined ? ensureEncoding(args.encoding, 'encoding') : 'utf8';
    const mode =
      args.mode !== undefined
        ? (ensureString(args.mode, 'mode') as 'overwrite' | 'append')
        : 'overwrite';
    const result = fsService.writeFileContent(targetPath, content, { encoding, mode });
    return successResponse(result);
  }

  private async handleFileDeleteTool(args: Record<string, unknown>): Promise<McpResponse> {
    const targetPath = ensureString(args.path, 'path');
    const force = args.force !== undefined ? ensureBoolean(args.force, 'force') : false;
    await fsService.removePath(targetPath, force);
    return successResponse({ deleted: true, path: targetPath });
  }

  private async handleFileMkdirTool(args: Record<string, unknown>): Promise<McpResponse> {
    const paths = ensureStringArray(args.paths, 'paths');
    const result = await fsService.createDirectories(paths);
    return successResponse(result);
  }

  private asOptionalNumber(value: unknown, field: string): number | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    return ensureNumber(value, field);
  }
}
