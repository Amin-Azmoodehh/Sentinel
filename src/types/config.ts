export interface ProviderConfig {
  type: string;
  baseURL: string;
  apiKey?: string;
}

export interface ProvidersConfig {
  [key: string]: ProviderConfig;
}

export interface DefaultsConfig {
  provider: string;
  model: string;
}

export interface SecurityConfig {
  forbidden: string[];
  requiredRootDirs: string[];
  shell: {
    allowedCommands: string[];
    blockedCommands: string[];
  };
  [key: string]: unknown;
}

export interface ThresholdsConfig {
  gate: number;
  maxFileSizeMB: number;
  maxTodoCount: number;
  maxIndexLines: number;
}

export interface IndexingConfig {
  include: string[];
  ignore: string[];
}

export interface ConfigType {
  defaults: DefaultsConfig;
  providers: ProvidersConfig;
  thresholds: ThresholdsConfig;
  provider: Record<string, unknown>;
  security: SecurityConfig;
  i18n: Record<string, unknown>;
  indexing: IndexingConfig;
  meta: Record<string, unknown>;
}
