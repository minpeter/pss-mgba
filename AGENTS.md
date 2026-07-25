# AGENTS.md

## Project Context
pss-mgba is a Pokemon / mGBA agent OS workspace. The current checkout is `/Users/leesangmin/Desktop/pss-mgba` on `feat/agent-os`; its upstream branch may be gone, so confirm the target remote before pushing.

## Operating Rules
- Keep emulator control, agent OS, session authority, memory, evaluation, and game-loop changes scoped to the requested behavior.
- Do not commit logs, local memory dumps, generated traces, `.serena/`, or Codex prompt scratch files unless the user explicitly promotes one into documentation.
- Prefer deterministic tests and contract checks over long live emulator runs when validating shared logic.
- For runtime debugging, record the exact ROM/session/emulator state used and clean generated artifacts after the run.
- Preserve existing WIP. This repo has active untracked work, so stage by path or hunk only.

## Verification
Primary gate:
```bash
pnpm test
```

Useful broader gates:
```bash
pnpm run typecheck
pnpm run check:session-authority
pnpm run build
```

For emulator-facing changes, add the smallest reproducible run or trace evidence that proves the changed loop actually executes.
