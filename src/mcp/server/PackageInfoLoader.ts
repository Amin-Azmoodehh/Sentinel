import * as fs from 'fs';
import * as path from 'path';
import { SecurityValidator } from '../securityValidator.js';
import { log } from '../../utils/logger.js';

export class PackageInfoLoader {
  private serverName: string = 'sentinel-tm';
  private serverVersion: string = '1.2.0';

  constructor() {
    this.loadPackageInfo();
  }

  getInfo(): { name: string; version: string } {
    return {
      name: this.serverName,
      version: this.serverVersion,
    };
  }

  private loadPackageInfo(): void {
    try {
      const packageJsonPath = path.resolve(process.cwd(), 'package.json');
      const content = fs.readFileSync(packageJsonPath, 'utf-8');

      if (SecurityValidator.containsDangerousCode(content)) {
        log.warn('Dangerous patterns detected in package.json, using defaults');
        return;
      }

      const packageJson = JSON.parse(content);

      if (packageJson.name && typeof packageJson.name === 'string') {
        this.serverName = SecurityValidator.sanitizeInput(packageJson.name) || this.serverName;
      }
      if (packageJson.version && typeof packageJson.version === 'string') {
        this.serverVersion =
          SecurityValidator.sanitizeInput(packageJson.version) || this.serverVersion;
      }
    } catch {
      // Use defaults on any error
    }
  }
}
