#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_HISTORY_LIMIT = 200;

function runGit(command, fallback = '') {
  try {
    return execSync(command, { encoding: 'utf-8' }).trim();
  } catch {
    return fallback;
  }
}

function getGitCommitHistory(limit) {
  const raw = runGit(
    `git log --date=iso-strict --pretty=format:"%H%x1f%h%x1f%ad%x1f%an%x1f%s%x1f%b%x1e" -${limit}`,
    ''
  );

  if (!raw) {
    return [];
  }

  return raw
    .split('\x1e')
    .filter(Boolean)
    .map((entry) => {
      const [sha, shortSha, timestamp, author, subject, body] = entry.split('\x1f');
      return {
        id: `commit-${sha}`,
        kind: 'commit',
        source: 'git-history',
        sha,
        shortSha,
        timestamp,
        date: String(timestamp || '').slice(0, 10),
        author: author || 'BrushBeats',
        subject,
        body: String(body || '').trim()
      };
    });
}

function buildVersionHistory(limit) {
  return getGitCommitHistory(limit);
}

async function main() {
  try {
    const gitSha = process.env.VITE_GIT_SHA || runGit('git rev-parse HEAD', 'unknown');
    const versionHistory = buildVersionHistory(DEFAULT_HISTORY_LIMIT);

    const envContent = `VITE_GIT_SHA=${gitSha}\n`;
    const envPath = path.join(__dirname, '../.env.local');
    const generatedDir = path.join(__dirname, '../src/generated');
    const historyPath = path.join(generatedDir, 'versionHistory.json');

    fs.writeFileSync(envPath, envContent, 'utf-8');
    fs.mkdirSync(generatedDir, { recursive: true });
    fs.writeFileSync(historyPath, JSON.stringify(versionHistory, null, 2), 'utf-8');
    console.log(`✓ Version injected: ${String(gitSha).substring(0, 7)}`);
    console.log(`✓ History refreshed: ${versionHistory.length} entries from git history`);
  } catch (error) {
    console.warn('⚠ Could not inject git version:', error.message);
  }
}

main();
