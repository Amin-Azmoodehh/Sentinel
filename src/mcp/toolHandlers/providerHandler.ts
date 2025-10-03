import * as providerService from '../../services/providerService.js';
import { ensureString, ensureObject } from '../validation.js';
import { McpResponse, McpError } from '../types.js';
import { successResponse } from '../utils.js';

const PROVIDER_ACTIONS = [
  'detect',
  'resolvePreferred',
  'listAllowed',
  'setProvider',
  'setModel',
  'listModels',
] as const;
type ProviderAction = (typeof PROVIDER_ACTIONS)[number];

export class ProviderHandler {
  async handleProviderTool(args: Record<string, unknown>): Promise<McpResponse> {
    const action = ensureString(args.action, 'action') as ProviderAction;
    if (!PROVIDER_ACTIONS.includes(action)) {
      throw new McpError('Unsupported provider action: ' + action);
    }
    const payload = args.payload ? ensureObject(args.payload, 'payload') : {};

    switch (action) {
      case 'detect': {
        const detection = providerService.detectProviders();
        return successResponse(detection);
      }
      case 'resolvePreferred': {
        const preferred = providerService.resolvePreferredProvider();
        return successResponse(preferred);
      }
      case 'listAllowed': {
        const allowed = providerService.getAllowedProviders();
        return successResponse({ providers: allowed });
      }
      case 'setProvider': {
        const provider = ensureString(payload.provider, 'payload.provider');
        const allowed = providerService.getAllowedProviders();
        if (!allowed.includes(provider)) {
          throw new McpError('Provider not in allowlist: ' + provider, 'ERR_FORBIDDEN');
        }
        providerService.setProvider(provider);
        const resolved = providerService.resolvePreferredProvider();
        return successResponse({ provider, resolved });
      }
      case 'setModel': {
        const model = ensureString(payload.model, 'payload.model');
        providerService.setModel(model);
        return successResponse({ model });
      }
      case 'listModels': {
        const provider = payload.provider
          ? ensureString(payload.provider, 'payload.provider')
          : undefined;
        const result = providerService.listModels(provider);
        return successResponse(result);
      }
      default: {
        const exhaustiveCheck: never = action;
        throw new McpError('Unhandled provider action: ' + exhaustiveCheck);
      }
    }
  }
}
