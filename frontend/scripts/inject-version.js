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

function getCommitsInRange(fromSha, toSha) {
  if (!toSha) return [];
  const range = fromSha ? `${fromSha}..${toSha}` : `${toSha}~1..${toSha}`;
  const raw = runGit(
    `git log --date=iso-strict --pretty=format:"%H|%h|%ad|%s" ${range}`,
    ''
  );

  if (!raw) return [];

  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [sha, shortSha, timestamp, subject] = line.split('|');
      return { sha, shortSha, timestamp, message: subject || '' };
    });
}

function enrichPushesWithGitLog(pushHistory, commitHistory) {
  if (pushHistory.length === 0) return pushHistory;

  const sorted = [...pushHistory].sort(
    (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)
  );

  for (let i = 0; i < sorted.length; i++) {
    const push = sorted[i];
    const prevPush = sorted[i + 1];
    const rangeCommits = getCommitsInRange(prevPush?.sha || '', push.sha);

    if (rangeCommits.length > 0) {
      push.commits = rangeCommits.map((c) => ({
        sha: c.sha,
        shortSha: c.shortSha,
        message: c.message
      }));
      push.subject =
        rangeCommits.length === 1
          ? rangeCommits[0].message
          : `${rangeCommits.length} commits pushed`;
    } else {
      // Fall back to matching commit from git log by SHA
      const match = commitHistory.find((c) => c.sha === push.sha);
      if (match) {
        push.subject = match.subject;
        push.commits = [{ sha: match.sha, shortSha: match.shortSha, message: match.subject }];
      }
    }
  }

  return sorted;
}

function mergeHistory(pushHistory, commitHistory, limit) {
  // Remove commit entries whose SHA is already represented by a push entry
  const pushShas = new Set(pushHistory.map((p) => p.sha).filter(Boolean));
  const filteredCommits = commitHistory.filter((c) => !pushShas.has(c.sha));

  return [...pushHistory, ...filteredCommits]
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
    const rawPushHistory = await getGitHubPushHistory(owner, repo, Math.floor(DEFAULT_HISTORY_LIMIT / 2));
    const pushHistory = enrichPushesWithGitLog(rawPushHistory, commitHistory);
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
