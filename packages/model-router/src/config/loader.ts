import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RouterConfigSchema, type RouterConfig } from './schema.js';

const CONFIG_PATH = join(dirname(fileURLToPath(import.meta.url)), '../../config/router-config.json');

let _cached: RouterConfig | null = null;

export function loadRouterConfig(configPath = CONFIG_PATH): RouterConfig {
  if (_cached) return _cached;
  const raw = JSON.parse(readFileSync(configPath, 'utf-8')) as unknown;
  _cached = RouterConfigSchema.parse(raw);
  return _cached;
}

/** For tests: override the cached config */
export function setRouterConfig(config: RouterConfig): void {
  _cached = config;
}

export function clearConfigCache(): void {
  _cached = null;
}
