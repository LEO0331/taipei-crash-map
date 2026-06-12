# AGENTS.md

Lightweight harness for agent-assisted work on the Taipei Traffic Accident Hotspot Map.

## Startup Workflow

Before editing code:

1. Confirm the repo root with `pwd`.
2. Read this file, `README.md`, `feature_list.json`, and `progress.md`.
3. Review recent changes with `git status --short` and `git log --oneline -5`.
4. Run `./init.sh` when you need a clean baseline, or explain why you deferred it.
5. Pick one unfinished feature from `feature_list.json`.

## Project Facts

- Stack: Vite, React, TypeScript, Leaflet, Recharts, static JSON data, PWA assets.
- Main source lives in `src/`.
- Public generated data lives in `public/data/`.
- Data conversion is handled by `npm run convert:accidents` and reads source CSVs from `/Users/Leo/Downloads`.
- Deployment target is static hosting/GitHub Pages under `/taipei-crash-map/`.

## Working Rules

- One-feature-at-a-time: pick exactly one unfinished feature from `feature_list.json` and keep edits inside that scope.
- Keep changes scoped to one feature or bugfix.
- Do not edit generated accident JSON by hand; update the converter or source flow instead.
- Preserve bilingual Traditional Chinese/English UI behavior.
- Treat map, dashboard, and PWA/mobile changes as visual work: verify desktop and mobile layouts when touched.
- Do not add dependencies unless the user explicitly approves.
- Do not revert unrelated user changes in the worktree.
- Record meaningful verification evidence before claiming done.

## Verification

Full verification:

```bash
./init.sh
```

Required checks:

- `npm run build`
- `npm test`

Additional checks when relevant:

- `npm run dev` plus browser inspection for layout/map changes.
- `npm run convert:accidents` when conversion logic or generated data contracts change.
- Production preview with `npm run preview` for deployment/base-path issues.

## Definition of Done

A feature is done only when:

- The intended behavior is implemented.
- Required checks ran and results are recorded in `progress.md` or `feature_list.json`.
- Mobile/PWA and desktop views were checked for UI-facing changes.
- Risks or skipped verification are documented.
- The next session can restart from `AGENTS.md`, `feature_list.json`, `progress.md`, and `./init.sh`.

## End of Session

Before ending substantial work:

1. Update `progress.md` with status, evidence, files changed, and next step.
2. Update `feature_list.json` if a tracked feature changed status.
3. Use `session-handoff.md` for multi-session or partially complete work.
4. Leave generated artifacts, caches, and temporary browser outputs out of git unless intentionally needed.
