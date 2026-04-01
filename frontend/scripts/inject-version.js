#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  // Get git SHA from environment (GitHub Actions) or from git command
  const gitSha = process.env.VITE_GIT_SHA || 
    execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  
  const envContent = `VITE_GIT_SHA=${gitSha}\n`;
  const envPath = path.join(__dirname, '../.env.local');
  
  fs.writeFileSync(envPath, envContent, 'utf-8');
  console.log(`✓ Version injected: ${gitSha.substring(0, 7)}`);
} catch (error) {
  console.warn('⚠ Could not inject git version:', error.message);
}
