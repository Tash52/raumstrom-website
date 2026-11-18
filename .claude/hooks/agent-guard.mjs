#!/usr/bin/env node
// PreToolUse guard for subagents.
// Agent frontmatter can only allow or remove whole tools. This hook adds the
// path- and command-level limits the project rules require:
//   - no subagent pushes (only the orchestrator does)
//   - review agents may write only below docs/ (or scratch files in /tmp)
//   - review agents may not change git state
//   - skill-auditor may only clone into /tmp and run read-only commands
// The main session (no agent_type in the payload) is never restricted.
// Exit code 2 blocks the tool call; stderr is shown to the agent as the reason.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REVIEW_AGENTS = new Set([
  'skill-auditor',
  'security-auditor',
  'qa-verifier',
  'a11y-perf-tester',
]);
const WRITE_TOOLS = new Set(['Write', 'Edit', 'NotebookEdit']);

const GIT_PUSH = /\bgit\b[^|;&\n]*\bpush\b/;
const GIT_MUTATION =
  /\bgit\s+(?:-C\s+\S+\s+)?(?:commit|add|rm|mv|reset|checkout|restore|switch|clean|rebase|merge|stash|apply|am|cherry-pick|revert|tag)\b/;

// skill-auditor: every pipeline segment must be one of these read-only forms.
const AUDITOR_ALLOWED = [
  /^git clone --depth[= ]1 https:\/\/github\.com\/[\w.-]+\/[\w.-]+ \/tmp\/[\w./-]+$/,
  /^git -C \/tmp\/[\w./-]+ (?:rev-parse|log|ls-files|show|status|shortlog|describe|cat-file)\b[^;&`$><]*$/,
  /^curl -sS(?: -m \d+)? https:\/\/api\.github\.com\/repos\/[\w.-]+\/[\w.-]+$/,
  /^(?:ls|wc|du|file|stat|head|tail|cat|sort|uniq|cut|tr|grep)\b[^;&`$><]*$/,
  /^find\b(?![^;&`$><]*\s-(?:exec|execdir|delete|ok|fprint|fls)\b)[^;&`$><]*$/,
];

/** @returns {string | null} reason for denial, or null if the call may proceed */
export function check(input, projectDir) {
  const agent = input?.agent_type;
  if (!agent) return null;

  const tool = input.tool_name;
  const toolInput = input.tool_input ?? {};

  if (tool === 'Bash') {
    const command = String(toolInput.command ?? '');
    if (GIT_PUSH.test(command)) {
      return 'Nur der Orchestrator pusht. Melde stattdessen, was gepusht werden soll.';
    }
    if (REVIEW_AGENTS.has(agent) && GIT_MUTATION.test(command)) {
      return `${agent} darf den Git-Stand nicht verändern (nur lesen und testen).`;
    }
    if (agent === 'skill-auditor') {
      if (/[;&`\n]|\$\(|[<>]/.test(command)) {
        return 'skill-auditor: nur einzelne Lese-Befehle, keine Verkettung oder Umleitung.';
      }
      const segments = command.split('|').map((s) => s.trim());
      const ok = segments.every((seg) => AUDITOR_ALLOWED.some((re) => re.test(seg)));
      if (!ok) {
        return 'skill-auditor: erlaubt sind nur `git clone --depth 1` nach /tmp und Lese-Befehle (git log, ls, wc, grep, find …). Nichts aus Klonen ausführen.';
      }
    }
    return null;
  }

  if (WRITE_TOOLS.has(tool) && REVIEW_AGENTS.has(agent)) {
    const target = toolInput.file_path ?? toolInput.notebook_path;
    if (!target) return `${agent}: Schreibziel nicht erkennbar, Aufruf abgelehnt.`;
    const abs = path.resolve(input.cwd ?? projectDir, String(target));
    const rel = path.relative(projectDir, abs);
    const insideProject = rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
    if (insideProject) {
      if (!/^(?:\.claude\/worktrees\/[^/]+\/)?docs\//.test(rel)) {
        return `${agent} darf im Projekt nur unter docs/ schreiben (nicht: ${rel}). Befunde gehen an den bauenden Agenten zurück.`;
      }
    } else if (!abs.startsWith('/tmp/')) {
      return `${agent} darf außerhalb des Projekts nur unter /tmp schreiben (nicht: ${abs}).`;
    }
  }
  return null;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    process.exit(0); // unreadable payload: do not interfere
  }
  const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const reason = check(input, projectDir);
  if (reason) {
    process.stderr.write(`agent-guard: ${reason}\n`);
    process.exit(2);
  }
  process.exit(0);
}
