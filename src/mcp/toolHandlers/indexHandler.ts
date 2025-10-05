import * as indexService from '../../services/indexService.js';
import { ensureString, ensureNumber, ensureObject } from '../validation.js';
import { McpResponse, McpError } from '../types.js';
import { successResponse } from '../utils.js';

const INDEX_ACTIONS = ['refresh', 'status', 'search', 'symbols', 'document'] as const;
type IndexAction = (typeof INDEX_ACTIONS)[number];

export class IndexHandler {
  async handleIndexTool(args: Record<string, unknown>): Promise<McpResponse> {
    const action = ensureString(args.action, 'action') as IndexAction;
    if (!INDEX_ACTIONS.includes(action)) {
      throw new McpError('Unsupported index action: ' + action);
    }
    const payload = args.payload ? ensureObject(args.payload, 'payload') : {};

    switch (action) {
      case 'refresh': {
        const root = process.cwd();
        await indexService.indexProject(root);
        return successResponse({ indexed: root });
      }
      case 'status': {
        const status = indexService.indexStatus();
        return successResponse(status);
      }
      case 'search': {
        const query = ensureString(payload.query, 'payload.query');
        const limit = this.asOptionalNumber(payload.limit, 'payload.limit');
        const results = indexService.searchFileContents(query, limit);
        return successResponse({ results });
      }
      case 'symbols': {
        const options: indexService.SymbolQueryOptions = {};
        if (payload.filePath !== undefined) {
          options.filePath = ensureString(payload.filePath, 'payload.filePath');
        }
        if (payload.name !== undefined) {
          options.name = ensureString(payload.name, 'payload.name');
        }
        if (payload.kind !== undefined) {
          options.kind = ensureString(payload.kind, 'payload.kind');
        }
        if (payload.limit !== undefined) {
          options.limit = ensureNumber(payload.limit, 'payload.limit');
        }
        const results = indexService.listIndexedSymbols(options);
        return successResponse(results);
      }
      case 'document': {
        const filePath = ensureString(payload.path ?? payload.filePath, 'payload.path');
        const maxBytes = this.asOptionalNumber(payload.maxBytes, 'payload.maxBytes');
        const result = indexService.getFileDocument(filePath, maxBytes);
        if (!result) {
          throw new McpError(
            `Document not found: ${filePath}. Use relative path from workspace root (e.g., "src/file.ts")`,
            'ERR_NOT_FOUND'
          );
        }
        return successResponse(result);
      }
      default:
        throw new McpError('Unhandled index action: ' + action);
    }
  }

  private async handleIndexBuildTool(args: Record<string, unknown>): Promise<McpResponse> {
    const root = args.root !== undefined ? ensureString(args.root, 'root') : process.cwd();
    await indexService.indexProject(root);
    return successResponse({ indexed: root });
  }

  private async handleIndexQueryTool(args: Record<string, unknown>): Promise<McpResponse> {
    const kind = ensureString(args.kind, 'kind');
    switch (kind) {
      case 'search': {
        const query = ensureString(args.query, 'query');
        const limit = args.limit !== undefined ? ensureNumber(args.limit, 'limit') : undefined;
        const results = indexService.searchFileContents(query, limit);
        return successResponse({ results });
      }
      case 'symbols': {
        const options: indexService.SymbolQueryOptions = {};
        if (args.filePath !== undefined) {
          options.filePath = ensureString(args.filePath, 'filePath');
        }
        if (args.name !== undefined) {
          options.name = ensureString(args.name, 'name');
        }
        if (args.symbolKind !== undefined) {
          options.kind = ensureString(args.symbolKind, 'symbolKind');
        }
        if (args.limit !== undefined) {
          options.limit = ensureNumber(args.limit, 'limit');
        }
        const results = indexService.listIndexedSymbols(options);
        return successResponse({ results });
      }
      case 'document': {
        const filePath = ensureString(args.filePath ?? args.path, 'filePath');
        const maxBytes =
          args.maxBytes !== undefined ? ensureNumber(args.maxBytes, 'maxBytes') : undefined;
        const document = indexService.getFileDocument(filePath, maxBytes);
        if (!document) {
          throw new McpError('Indexed document not found: ' + filePath, 'ERR_NOT_FOUND');
        }
        return successResponse({ document });
      }
      default: {
        throw new McpError('Unsupported index query kind: ' + kind);
      }
    }
  }

  private asOptionalNumber(value: unknown, field: string): number | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    return ensureNumber(value, field);
  }
}
