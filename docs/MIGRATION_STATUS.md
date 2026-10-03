# SDP 2.0 migration status

## Completed in the foundation release

| Area | Result |
| --- | --- |
| Frontend | Rebuilt as a responsive decision room with briefing, scenario lab, local library, portfolio, method, and runtime views |
| Backend | Replaced the browser-to-AWS dependency with server-only Next.js route handlers and strict Zod request/output contracts |
| Models | Added xAI 4.1 challenger, Gemini 3.5 Flash signal analysis, and GPT-6 Luna structured synthesis |
| Security | Removed hardcoded provider credentials from tracked source, removed the tracked root `.env.local`, and eliminated client-visible API URLs |
| Platform | Upgraded to Next.js 16.3, React 19.3, AI SDK 7, TypeScript 6, and Node 24 |
| Quality | Added lint, typecheck, unit tests, production build, health checks, and desktop/mobile browser verification |
| Hosting | Replaced AWS deployment workflows with pinned Vercel build, smoke test, and artifact promotion |

## Release blockers

1. Revoke the Google-style key previously committed to Git history.
2. Add authentication before granting access beyond a controlled internal pilot.
3. Commit and push the reviewed overhaul, then run the first deployment workflow.

The `sdp-decision-room` Vercel project is linked to `frontend/web-app`, uses Node 24, and its three connection values are already stored as GitHub Actions secrets.

## Next product milestones

### Durable workspace

- Add organization, workspace, member, brief, scenario-set, evidence, signpost, and audit-event tables.
- Move browser-local results to server-side persistence with tenant isolation.
- Add shareable decision-brief URLs, roles, and export.

### Evidence engine

- Accept user sources and approved connectors.
- Chunk, embed, retrieve, and cite only evidence available to the workspace.
- Store claim-to-source links and freshness timestamps.
- Add a research queue for unsupported claims surfaced by the models.

### Operational foresight

- Turn signposts into monitored indicators with owners, thresholds, and review cadence.
- Record decisions and assumptions so teams can see when the basis for a decision changed.
- Add scenario-set versioning and side-by-side reviews.

### Production controls

- Add authenticated per-workspace rate limits and budget policies.
- Add prompt/output redaction, audit events, and retention policies.
- Add model-level latency, failure, token, and cost telemetry without logging sensitive briefs.
- Add end-to-end tests against provider test doubles and a gated live-provider smoke suite.

## Legacy retirement

The `backend/` Python services, AWS guides, Docker Compose file, and root historical phase documents are retained temporarily for output-parity review. They are not deployed by current workflows. Archive or remove them once the Vercel implementation meets the agreed persistence and evidence requirements.
