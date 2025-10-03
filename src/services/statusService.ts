import { readJsonFile } from '../utils/fileSystem.js';
import { configService, type Config } from './configService.js';
import { detectProviders, type ProviderInfo } from './providerService.js';
import { indexStatus } from './indexService.js';
import { getTaskSummary, type TaskSummary } from './taskService.js';
import { type GateRunMeta } from './gateService.js';
import { paths } from '../constants/paths.js';

export interface ProviderStatus {
  defaultProvider: string | null;
  defaultModel: string | null;
  active: ProviderInfo | null;
  detected: ProviderInfo[];
}

export interface SystemStatus {
  version: string;
  timestamp: number;
  provider: ProviderStatus;
  gate: GateRunMeta | null;
  index: {
    files: number;
    symbols: number;
    lastRun: number | null;
  };
  tasks: TaskSummary;
}

const isGateRunMeta = (value: unknown): value is GateRunMeta => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const meta = value as Record<string, unknown>;
  return (
    typeof meta.timestamp === 'number' &&
    typeof meta.threshold === 'number' &&
    typeof meta.success === 'boolean' &&
    typeof meta.attempts === 'number' &&
    typeof meta.fallback === 'boolean' &&
    (meta.source === 'internal' || meta.source === 'cli') &&
    (meta.score === null || typeof meta.score === 'number')
  );
};

const getGateMeta = (config: Config): GateRunMeta | null => {
  const raw = (config.meta as Record<string, unknown> | undefined)?.gate as
    | { lastRun?: unknown }
    | undefined;
  return raw && isGateRunMeta(raw.lastRun) ? (raw.lastRun as GateRunMeta) : null;
};

const getPackageVersion = (): string => {
  const pkg = readJsonFile<{ version?: string }>(paths.packageJson(), { version: 'unknown' });
  return pkg.version ?? 'unknown';
};

const normalizeProviderStatus = (config: Config): { status: ProviderStatus; config: Config } => {
  const detection = detectProviders();
  let defaultProvider =
    typeof config.defaults?.provider === 'string' ? config.defaults.provider : null;
  const defaultModel = typeof config.defaults?.model === 'string' ? config.defaults.model : null;
  let active = defaultProvider
    ? (detection.providers.find(
        (provider) => provider.name === defaultProvider && provider.available
      ) ?? null)
    : null;
  let currentConfig = config;

  if (!active) {
    active = detection.providers.find((provider) => provider.available) ?? null;
    if (active && defaultProvider !== active.name) {
      defaultProvider = active.name;
      currentConfig = {
        ...config,
        defaults: {
          ...config.defaults,
          provider: active.name,
        },
      };
      configService.save(currentConfig);
    }
  }

  return {
    status: {
      defaultProvider,
      defaultModel,
      active,
      detected: detection.providers,
    },
    config: currentConfig,
  };
};

export const getSystemStatus = async (): Promise<SystemStatus> => {
  const loadedConfig = configService.load();
  const { status: provider, config } = normalizeProviderStatus(loadedConfig);
  const gate = getGateMeta(config);
  const index = indexStatus();
  const tasks = getTaskSummary();
  const version = getPackageVersion();

  return {
    version,
    timestamp: Date.now(),
    provider,
    gate,
    index,
    tasks,
  };
};

export const statusService = {
  getSystemStatus,
};
