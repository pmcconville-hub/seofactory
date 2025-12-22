/**
 * Updates public/version.json with current timestamp
 * Run before each build to ensure version changes on deploy
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const versionFile = path.join(__dirname, '..', 'public', 'version.json');

// Read current version or create default
let version = { version: '1.0.0', buildTime: '' };

try {
  const existing = fs.readFileSync(versionFile, 'utf8');
  version = JSON.parse(existing);
} catch (e) {
  // File doesn't exist, use defaults
}

// Update build time
version.buildTime = new Date().toISOString();

// Optionally increment patch version based on git commit count or use timestamp
// For simplicity, we'll use a timestamp-based version
const now = new Date();
version.version = `1.0.${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

fs.writeFileSync(versionFile, JSON.stringify(version, null, 2));

console.log(`[update-version] Updated version to ${version.version} at ${version.buildTime}`);
