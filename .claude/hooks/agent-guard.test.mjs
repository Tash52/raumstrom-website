// Run with: node --test .claude/hooks/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { check } from './agent-guard.mjs';

const P = '/repo';
const bash = (agent, command) =>
  check({ agent_type: agent, tool_name: 'Bash', tool_input: { command }, cwd: P }, P);
const write = (agent, file_path, tool = 'Write', cwd = P) =>
  check({ agent_type: agent, tool_name: tool, tool_input: { file_path }, cwd }, P);

test('main session is never restricted', () => {
  assert.equal(check({ tool_name: 'Bash', tool_input: { command: 'git push -u origin main' } }, P), null);
  assert.equal(check({ tool_name: 'Write', tool_input: { file_path: '/repo/src/a.ts' } }, P), null);
});

test('no subagent may push', () => {
  assert.ok(bash('architect', 'git push -u origin main'));
  assert.ok(bash('page-builder', 'npm test && git -C /repo push'));
  assert.equal(bash('architect', 'git commit -m "x"'), null);
  assert.equal(bash('architect', 'npm run build'), null);
});

test('review agents may not change git state', () => {
  for (const agent of ['qa-verifier', 'security-auditor', 'a11y-perf-tester']) {
    assert.ok(bash(agent, 'git commit -am fix'), agent);
    assert.ok(bash(agent, 'git -C /repo reset --hard'), agent);
    assert.ok(bash(agent, 'git checkout -- src'), agent);
    assert.equal(bash(agent, 'git status --short'), null, agent);
    assert.equal(bash(agent, 'git diff HEAD~1'), null, agent);
    assert.equal(bash(agent, 'npm ci && npm run build:staging && npx playwright test'), null, agent);
  }
});

test('review agents write only below docs/ or /tmp', () => {
  assert.equal(write('qa-verifier', '/repo/docs/agent-reports/1-qa-verifier.md'), null);
  assert.equal(write('qa-verifier', 'docs/agent-reports/1-qa-verifier.md'), null);
  assert.equal(write('security-auditor', '/repo/docs/SECURITY-REPORT.md', 'Edit'), null);
  assert.equal(write('qa-verifier', '/tmp/check/shot.mjs'), null);
  assert.equal(write('qa-verifier', '/repo/.claude/worktrees/w1/docs/x.md'), null);
  assert.ok(write('qa-verifier', '/repo/src/pages/index.astro'));
  assert.ok(write('qa-verifier', 'src/pages/index.astro', 'Edit'));
  assert.ok(write('a11y-perf-tester', '/repo/package.json'));
  assert.ok(write('security-auditor', '/repo/docs/../server/server.mjs'));
  assert.ok(write('qa-verifier', '/repo/docsx/evil.md'));
  assert.ok(write('qa-verifier', '/home/user/.bashrc'));
  assert.ok(write('skill-auditor', '/repo/.claude/skills/x/SKILL.md'));
  assert.ok(check({ agent_type: 'qa-verifier', tool_name: 'Write', tool_input: {} }, P));
});

test('building agents may write project files', () => {
  assert.equal(write('architect', '/repo/src/content.config.ts'), null);
  assert.equal(write('docs-writer', '/repo/PLATZHALTER.md'), null);
});

test('skill-auditor: clone into /tmp and read-only commands only', () => {
  const a = 'skill-auditor';
  assert.equal(bash(a, 'git clone --depth 1 https://github.com/CloudAI-X/threejs-skills /tmp/audit/threejs'), null);
  assert.equal(bash(a, 'git -C /tmp/audit/threejs rev-parse HEAD'), null);
  assert.equal(bash(a, 'git -C /tmp/audit/threejs log -1 --format=%cI'), null);
  assert.equal(bash(a, 'ls -la /tmp/audit/threejs'), null);
  assert.equal(bash(a, 'find /tmp/audit -name "*.sh"'), null);
  assert.equal(bash(a, 'git -C /tmp/audit/threejs ls-files | wc -l'), null);
  assert.equal(bash(a, 'grep -rn "curl" /tmp/audit/threejs | head -50'), null);
  assert.equal(bash(a, 'curl -sS -m 15 https://api.github.com/repos/CloudAI-X/threejs-skills'), null);
  assert.ok(bash(a, 'git clone https://github.com/x/y /home/user/raumstrom-website/vendor'));
  assert.ok(bash(a, 'git clone --depth 1 https://evil.example/x/y /tmp/a'));
  assert.ok(bash(a, 'bash /tmp/audit/threejs/install.sh'));
  assert.ok(bash(a, 'npm install'));
  assert.ok(bash(a, 'node /tmp/audit/x/scripts/run.js'));
  assert.ok(bash(a, 'ls /tmp && bash /tmp/audit/x/install.sh'));
  assert.ok(bash(a, 'cat /tmp/a | bash'));
  assert.ok(bash(a, 'find /tmp/audit -name "*.sh" -exec sh {} +'));
  assert.ok(bash(a, 'ls $(cat /tmp/x)'));
  assert.ok(bash(a, 'cat /tmp/a > /repo/src/x'));
  assert.ok(bash(a, 'curl -sS https://evil.example/x'));
});

test('CLI: exit 2 with reason on deny, exit 0 otherwise', () => {
  const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'agent-guard.mjs');
  const run = (payload) =>
    spawnSync(process.execPath, [script], { input: typeof payload === 'string' ? payload : JSON.stringify(payload), encoding: 'utf8' });
  const denied = run({ agent_type: 'qa-verifier', tool_name: 'Bash', tool_input: { command: 'git push' } });
  assert.equal(denied.status, 2);
  assert.match(denied.stderr, /agent-guard:/);
  assert.equal(run({ tool_name: 'Bash', tool_input: { command: 'git push' } }).status, 0);
  assert.equal(run('not json').status, 0);
});
