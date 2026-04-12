#!/usr/bin/env node

import fs from 'fs';
import https from 'https';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_HISTORY_LIMIT = 40;

function runGit(command, fallback = '') {
  try {
    return execSync(command, { encoding: 'utf-8' }).trim();
  } catch {
    return fallback;
  }
}

function parseGitHubRepo(remoteUrl) {
  const match = String(remoteUrl || '').match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/i);
  if (!match) {
    return null;
  }

  return {
    owner: match[1],
    name: match[2]
  };
}

function fetchJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }

        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
  });
}

function getGitCommitHistory(limit) {
  const raw = runGit(
    `git log --date=iso-strict --pretty=format:"%H|%h|%ad|%s" -${limit}`,
    ''
  );

  if (!raw) {
    return [];
  }

  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [sha, shortSha, timestamp, subject] = line.split('|');
      return {
        id: `commit-${sha}`,
        kind: 'commit',
        source: 'git-log',
        sha,
        shortSha,
        timestamp,
        date: String(timestamp || '').slice(0, 10),
        subject
      };
    });
}

function summarizePushEvent(event) {
  const commits = event?.payload?.commits || [];
  const actor = event?.actor?.login || 'unknown';
  const ref = String(event?.payload?.ref || '').replace('refs/heads/', '');

  if (commits.length === 1) {
    return commits[0].message || `Push by ${actor}${ref ? ` to ${ref}` : ''}`;
  }

  if (commits.length > 1) {
    return `${commits.length} commits pushed by ${actor}${ref ? ` to ${ref}` : ''}`;
  }

  return `Push by ${actor}${ref ? ` to ${ref}` : ''}`;
}

async function getGitHubPushHistory(owner, repo, limit) {
  if (!owner || !repo) {
    return [];
  }

  const token = process.env.GITHUB_TOKEN || process.env.VITE_GITHUB_TOKEN;
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'BrushBeats-Version-Script'
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const events = await fetchJson(
      `https://api.github.com/repos/${owner}/${repo}/events?per_page=100`,
      headers
    );

    if (!Array.isArray(events)) {
      return [];
    }

    return events
      .filter((event) => event?.type === 'PushEvent')
      .slice(0, limit)
      .map((event) => {
        const headSha = event?.payload?.head || event?.payload?.commits?.[0]?.sha || '';
        const pushedAt = event?.created_at || '';
        return {
          id: `push-${event.id}`,
          kind: 'push',
          source: 'github-push',
          sha: headSha,
          shortSha: headSha ? headSha.slice(0, 7) : 'push',
          timestamp: pushedAt,
          date: String(pushedAt).slice(0, 10),
          subject: summarizePushEvent(event),
          commits: (event?.payload?.commits || []).slice(0, 3).map((commit) => ({
            sha: commit.sha,
            shortSha: String(commit.sha || '').slice(0, 7),
            message: commit.message || ''
          }))
        };
      });
  } catch (error) {
    console.warn(`⚠ Could not fetch GitHub push events: ${error.message}`);
    return [];
  }
}

function mergeHistory(pushHistory, commitHistory, limit) {
  return [...pushHistory, ...commitHistory]
    .sort((a, b) => {
      const aTime = Date.parse(a.timestamp || a.date || 0);
      const bTime = Date.parse(b.timestamp || b.date || 0);
      return bTime - aTime;
    })
    .slice(0, limit);
}

async function main() {
  try {
    // Get git SHA from environment (GitHub Actions) or from git command.
    const gitSha = process.env.VITE_GIT_SHA || runGit('git rev-parse HEAD', 'unknown');
    const remoteUrl = runGit('git remote get-url origin', '');
    const remoteRepo = parseGitHubRepo(remoteUrl);
    const owner = process.env.VITE_GITHUB_OWNER || remoteRepo?.owner;
    const repo = process.env.VITE_GITHUB_REPO || remoteRepo?.name;

    const commitHistory = getGitCommitHistory(DEFAULT_HISTORY_LIMIT);
    const pushHistory = await getGitHubPushHistory(owner, repo, Math.floor(DEFAULT_HISTORY_LIMIT / 2));
    const mergedHistory = mergeHistory(pushHistory, commitHistory, DEFAULT_HISTORY_LIMIT);

    const envContent = `VITE_GIT_SHA=${gitSha}\n`;
    const envPath = path.join(__dirname, '../.env.local');
    const generatedDir = path.join(__dirname, '../src/generated');
    const historyPath = path.join(generatedDir, 'versionHistory.json');

    fs.writeFileSync(envPath, envContent, 'utf-8');
    fs.mkdirSync(generatedDir, { recursive: true });
    fs.writeFileSync(historyPath, JSON.stringify(mergedHistory, null, 2), 'utf-8');
    console.log(`✓ Version injected: ${String(gitSha).substring(0, 7)}`);
    console.log(`✓ History refreshed: ${mergedHistory.length} entries (${pushHistory.length} pushes + ${commitHistory.length} commits)`);
  } catch (error) {
    console.warn('⚠ Could not inject git version:', error.message);
  }
}

main();
