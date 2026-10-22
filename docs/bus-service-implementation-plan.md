# Policy #5 implementation plan

Date: 2026-10-21 Asia/Taipei. Branch: `codex/bus-network-service`. Base inspected/fetched: `5443ee5815deac968c228fd46954ec148c8e09ed` (`origin/main`). PR #7 and PR #8 are merged; preserve their Neihu module, documentation and Vite 8.3.4 upgrade. Feature: feat-007 only.

## Source gate before analytics

Audit the PTO API v6.3 document, eight bounded original static/published-service feeds, Taipei catalogues and current TDX bus/historical access. Preserve original compressed bytes, hashes, retrieval status and source update strings separately. Record feasibility before implementing review logic. Production Route/Stop/PathAttribute identities and schedule semantics must be verified from actual payloads/documentation. Catalogue/test files, GPS and arrival estimates cannot replace validated network or executed-service records.

Initial access probes find production gzip JSON available, but entity crosswalks, freshness/timezone and calendar semantics still require verification. Mode A may publish only validated inventory and documentation gaps. Mode B must remain disabled unless a real comparable executed-event cohort qualifies. No new dependencies, backend, Portfolio changes or accident-derived bus scores.

## Work ownership and sequence

1. Repository audit, main baseline, one feature tracker and this plan.
2. Bounded source lane: official audit, original acquisition, normalization, integrity/quality reports, deterministic snapshots and source tests.
3. Reference lane: independent current TDX/catalogue/test-resource semantics and access limitations.
4. After source feasibility: separate typed bus contracts, quality/published/history eligibility, deterministic tiers/capacity/balancing/sensitivity and safe exports; synthetic tests only for unavailable operational history.
5. Lazy bilingual dashboard/hook/map: compact initial index, selected-route detail only, bounded marker rendering, accessible fallback/error/retry, explicit published vs actual evidence.
6. Integrate navigation using existing appUrl and tab pattern. Preserve accident/Neihu fetch independence and existing service-worker policy.
7. Source regeneration and hash reproducibility; tests/root and Pages builds/harness; actual desktop/mobile browser and JSON/CSV downloads; payload and scenario timing measurements.
8. Required 18-section Traditional Chinese MVP, methodology, audit and delivery matrix; bilingual README/tracking/progress/handoff. One reviewable PR against main, never auto-merge.

## Acceptance and safeguards

Keys preserve source namespace, main route, path variant, direction, stop post versus physical location, sequence occurrence and calendar definition. No display-name joins or loop-stop deduplication. Unresolved relationships become retained quality issues. Unknown schedules/operational measures remain null, not zero service. Capacity allocates investigation effort, not passenger harm or transport improvements. Balanced strategy promises route/operator diversity only where identities qualify, not unverified district equity.

Writes stage a complete validated edition before atomically publishing its manifest; failures preserve the last good snapshot. Browser only fetches validated static files. Offline rebuilds reuse retained timestamps and input hashes. Exports carry scope, exclusions, provenance and formula-safe CSV. Real measurements and skipped checks belong in delivery records; historical/operational assumptions cannot be certified by fixture tests.
