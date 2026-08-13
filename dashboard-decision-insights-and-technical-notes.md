# Dashboard Decision Insights and Technical Notes

## Purpose and decision boundary

This application is a useful **descriptive decision-support tool** for locating historical crash concentrations, seeing time patterns, and framing questions for road-safety operations. It is not a live warning system, causal model, risk score, enforcement-performance measure, fault determination, or legal/insurance decision tool.

Use it to decide where to investigate, which time windows deserve field observation, and what supplementary evidence to request. Do not use it alone to decide that a road, district, driver group, or administrative process is unsafe, ineffective, or at fault.

## Practical insights for customers

1. **Use hotspot counts to prioritise investigation, not intervention by themselves.** A high-count intersection is a sensible candidate for a site visit, signal-timing review, conflict observation, and before/after study. Compare it with pedestrian volume, traffic volume, road layout, construction history, reporting practices, and exposure before allocating safety funding.

2. **Read the time filters as deployment cues.** A recurring hour or weekday pattern can help schedule site observations, school-zone checks, signal review, or public messaging. It does not prove that the displayed time is the cause of crashes.

3. **Keep accident levels separate.** The map/hotspot data, crash-detail dashboard, reported-violation statistics, and appraisal-reconsideration module use different populations and units. Do not divide one by another, join them by guessed dates or locations, or treat one series as an explanation of another.

4. **Treat A1/A2/A3 labels as source-specific severity classifications, not fault or quality signals.** The map’s A1/A2 terminology and the reconsideration dataset’s A1/A2/A3 composition answer different descriptive questions. A change in the latter is not evidence that Taipei roads became more or less dangerous.

5. **Use the reconsideration dashboard for procedural workload monitoring only.** A change in judicial referrals, individual applications, entered reconsiderations, or non-acceptance can guide resourcing and service-design questions. It cannot show whether an appraisal was correct, whether a person “won,” or whether the authority performed well.

6. **Use trends only after checking coverage.** The current reconsideration extract covers January 2017 through March 2023. Its apparent latest-period value is not a current citywide figure. Annual comparisons must be limited to complete years or clearly labelled partial-year comparisons.

## Recommended customer workflow

1. Pick a historical hotspot or time pattern worth investigating.
2. Confirm the period and source coverage shown in the dashboard.
3. Obtain exposure and context data: traffic/pedestrian counts, geometry, speed, signal plans, weather, roadworks, school or event calendars, and enforcement changes.
4. Conduct field observation and document a specific hypothesis.
5. Select an intervention with an owner and measurable outcome.
6. Evaluate before/after using comparable exposure-adjusted periods; do not use a raw-count change alone as proof.

## Technical and data notes requiring attention

| Priority | Finding | Why it matters | Recommended action |
| --- | --- | --- | --- |
| P1 | The crash-detail JSON is large (documented at roughly 28 MB party records plus 19 MB accident records before compression) and is precached by the service worker. | A first install or cache refresh can be slow or fail on constrained mobile networks/storage, even if the user never opens Crash Factors. | Remove these files from the install precache; fetch them only after the tab is opened, cache them at runtime, and present an offline-availability status. |
| P1 | The new reconsideration dashboard has core filtering and annual count aggregation, but does not yet provide every stated operational control: source/severity/valid-percentage filters, sorted/paginated/column-selectable table, or filtered CSV export. | Customers cannot yet fully audit or extract a selected slice of the aggregate series. | Add these controls and tests before representing the module as a complete analysis/export workspace. |
| P2 | Several aggregate-data hooks fetch immediately when the app mounts, even for inactive tabs. | It adds avoidable first-load requests and can make initial mobile use feel slower. | Load reported-violation and reconsideration datasets on first tab activation, following the crash-detail lazy-load pattern. |
| P2 | The service worker uses network-first data requests but intentionally suppresses precache errors and offers no visible data-freshness state. | A user may not know that offline data is unavailable or that a displayed local file is old. | Surface source update date, local ingestion date, fetch/cache state, and an explicit “data may be outdated” notice. |
| P2 | Automated tests are concentrated on transformation utilities; dashboard interaction, responsive layout, and accessibility regression coverage is limited. | A future chart/filter/table change can silently break customer use. | Add browser tests for each dashboard’s tab loading, keyboard navigation, filter-to-chart/table consistency, mobile overflow, and CSV output. |
| P3 | Static public JSON exposes all stored crash-detail fields to anyone who can fetch the files, even where the UI only shows aggregates. | This is acceptable only if every field and level of detail is appropriate for public redistribution. | Reconfirm publication and minimisation requirements with the data owner; publish only fields required for the dashboard where possible. |

## Data-governance checklist before a public decision or report

- Record the dashboard URL, dataset version, source update date, extraction date, filter state, and screenshot/export used.
- State the numerator, denominator, period coverage, and whether the result is raw count or exposure-adjusted rate.
- Have the responsible authority validate terminology and the A1/A2/A3 definitions used for that dataset.
- Ensure any public narrative states uncertainty and avoids claims about causation, fault, legal merit, safety ranking, or agency performance.
- Refresh data on a documented cadence and retain a conversion report so trends can be reproduced.

## Review conclusion

The dashboard is a credible exploratory starting point when used with the decision boundary above. The highest-value next investment is not another visualisation: it is making data freshness, coverage, exportability, and mobile/offline behaviour explicit, then pairing raw counts with exposure and field evidence before action is taken.
