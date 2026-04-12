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
  const gitHistoryRaw = execSync('git log --date=short --pretty=format:"%H|%h|%ad|%s" -15', { encoding: 'utf-8' }).trim();
  const gitHistory = gitHistoryRaw
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [sha, shortSha, date, subject] = line.split('|');
      return {
        sha,
        shortSha,
        date,
        subject
      };
    });
  
  const envContent = `VITE_GIT_SHA=${gitSha}\n`;
  const envPath = path.join(__dirname, '../.env.local');
  const generatedDir = path.join(__dirname, '../src/generated');
  const historyPath = path.join(generatedDir, 'versionHistory.json');
  
  fs.writeFileSync(envPath, envContent, 'utf-8');
  fs.mkdirSync(generatedDir, { recursive: true });
  fs.writeFileSync(historyPath, JSON.stringify(gitHistory, null, 2), 'utf-8');
  console.log(`✓ Version injected: ${gitSha.substring(0, 7)}`);
} catch (error) {
  console.warn('⚠ Could not inject git version:', error.message);
}
