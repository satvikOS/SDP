# SDP Decision Room

SDP is a Scenario Development Process for decisions that must remain sound under uncertainty. The current product replaces the previous AWS-first demo with a Vercel-native Next.js application, an accessible decision workspace, structured scenario outputs, and explicit evidence and dissent handling.

## What works now

- A public welcome page leads into a focused scenario workspace; no account is required.
- A decision brief captures the organization, industry, geography, focal question, horizon, constraints, and known uncertainties.
- Company search covers more than 10,000 globally relevant public and private organizations, including exchange and ticker metadata, while accepting any custom company name.
- Structured outputs include alternative futures, signposts, strategic moves, no-regret actions, evidence gaps, and dissent.
- Generated briefs are saved locally in the browser and support comparison, portfolio tracking, signals, templates, shareable read-only links, PDF export, and PowerPoint export.
- A custom in-product document studio reviews local PDF and `.pptx` evidence without uploading it.
- The OLED interface uses React Aria Components, keyboard-accessible controls, responsive navigation, reduced-motion support, and long-duration blue/moss ambient themes.
- GitHub Actions runs lint, TypeScript, unit tests, and a production build before deployment.
- A verified Vercel preview is promoted to production only after its runtime health check passes.

## Architecture

```mermaid
flowchart LR
  Browser[Decision workspace] --> Route[Next.js route handler]
  Route --> Analysis[Parallel analysis]
  Analysis --> Synthesis[Scenario synthesis]
  Synthesis --> Schema[Zod validation]
  Schema --> Browser
  Browser --> Local[Browser-local library and portfolio]
```

The active product lives in `frontend/web-app`. Python and AWS artifacts under `backend/` are legacy reference code and are not part of the Vercel runtime.

## Local verification

Provider keys are not stored in `.env` files. The UI, schemas, and failure paths can be verified without credentials:

```bash
cd frontend/web-app
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run dev
```

Without injected credentials, `GET /api/health` intentionally returns `503 configuration_required`. The product surface does not expose provider or model names.

## GitHub Actions secrets

The three existing provider secret names are:

- `XAI_API`
- `GEMINI_API`
- `OPENAI_API`

The Vercel workflow also requires:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

The workflow passes provider secrets directly to the deployment with Vercel CLI runtime flags. It does not create or populate an environment file. Pull requests run verification without provider secrets and cannot invoke paid models.

## Deploy

1. Create a Vercel project whose root is `frontend/web-app`.
2. Add the three Vercel connection values above as GitHub Actions secrets.
3. Keep the provider values in the existing GitHub Actions secrets.
4. Run the `Deploy Vercel` workflow or push to the `main` branch.
5. The workflow builds an immutable preview, checks `/api/health`, and promotes that exact artifact.

## Security release gate

An older Google-style credential was committed in the legacy Python source and documentation. It has been removed from the current tree, but Git history is immutable. Revoke and rotate that key before any deployment, then consider history rewriting with coordinated force-push only after every clone and integration is accounted for.

No provider key is exposed through a `NEXT_PUBLIC_` variable or returned by the health endpoint.

## Product boundaries

- Results, portfolio items, and signals are intentionally browser-local for this single-user academic deployment; there are no accounts, teams, or version history.
- Shared report links encode a read-only snapshot in the URL and do not provide collaborative editing.
- The document studio renders PDF pages and common PowerPoint text/image layouts locally; advanced SmartArt, embedded media, and unusual presentation effects may not reproduce exactly.
- Generated scenarios are not a substitute for sourced research. The product identifies evidence gaps rather than inventing citations.
- Legacy AWS infrastructure is no longer deployed, but the remaining legacy backend code is retained as reference until output-parity review is complete.

See [docs/MIGRATION_STATUS.md](docs/MIGRATION_STATUS.md) for the release plan and [SECURITY.md](SECURITY.md) for vulnerability reporting and credential rules.
