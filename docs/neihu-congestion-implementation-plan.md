# Neihu congestion decision support implementation plan

Date: 2026-10-21 (Asia/Taipei). Feature: feat-006. Branch: `codex/neihu-congestion-decision-support`.

## Scope and evidence gate

Implement one separate lazy-loaded bilingual module without changing accident scoring, conversion, navigation architecture, dependencies, or service-worker policy. Independent bounded work lanes cover official source audit/ETL, pure decision engine/tests, and dashboard/readiness UI. Integration and verification remain the lead's responsibility.

Before ranking, audit the actual official A–G resources and policy references. Initial catalogue inspection confirms the static VD and dynamic VD catalogues include tiny CSV interface pointers; those are not observation rows. The source audit will record actual endpoints, retained bytes and hashes, schema, temporal coverage, units, access failures, and suitability. No historical collection is assumed available. No citywide historical archives will be downloaded.

If comparable history is absent, publish a source/device readiness snapshot, explicit unknown performance indicators, independent quality review, and empty performance shortlists. Static devices and current observations never establish recurring slowdown. Unverified road joins, travel times, and units remain excluded. Synthetic analytical fixtures live only in tests.

## Implementation sequence

1. Complete repository audit and baseline checks; track exactly one new feature.
2. Document source feasibility before substantial source-dependent development.
3. Establish typed snapshot, source editions, directional device identities, and quality exclusions.
4. Build bounded acquisition and deterministic static conversion with hash checks and last-good preservation.
5. Implement pure aggregation, eligibility, separate review objectives, stable scenarios, scope comparisons, and safe aggregate exports.
6. Add responsive A–J dashboard, verified detector point map, filters, retry, source provenance, and bilingual navigation.
7. Verify source regeneration/reproducibility, tests, both builds, static checks, desktop/mobile browser behavior and lazy loading. Record actual measurements and limitations.
8. Update bilingual README, progress, feature state and handoff; prepare one reviewable PR without merging.

## Verification and environment

The shell's default `bash ./init.sh` currently fails with `Bash/E_ACCESSDENIED`; try installed Git Bash, otherwise execute its exact build/test contents and disclose the limitation. Initial npm and git filesystem writes require sandbox escalation. No dependencies are being added. Required checks include locked npm install, Vitest, TypeScript/Vite builds at root and GitHub Pages base, `git diff --check`, source pipeline checks, and actual browser review. Missing verification must remain explicit.
