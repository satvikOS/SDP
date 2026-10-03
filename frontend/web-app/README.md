# SDP Decision Room — Web Application

Next.js 16 application for the Scenario Development Process.

## Features

- **Scenario Workbench**: accessible React Aria brief builder with templates and timeline horizon control
- **Company Intelligence**: 10,000+ locally indexed listings, curated private organizations, live global exchange lookup, and custom entries
- **Decision Views**: scenario library, side-by-side comparison, portfolio, and signals board
- **Reports**: persistent browser-local PDF reports, read-only share links, and branded PowerPoint exports
- **Document Studio**: custom local PDF and high-fidelity `.pptx` viewer
- **OLED Interface**: responsive black canvas with long-duration blue/moss ambient themes

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Interaction Primitives**: React Aria Components
- **Styling**: custom CSS design system
- **Icons**: Lucide React
- **Deployment**: Vercel via GitHub Actions

## API Integration

The application uses Next.js route handlers:

- `/api/companies` — indexed company lookup
- `/api/scenarios` — scenario generation and validation
- `/api/health` — deployment readiness

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## Verify and deploy

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Provider credentials are injected only from GitHub Actions secrets during Vercel deployment. Do not create credential-bearing `.env` files or expose keys through `NEXT_PUBLIC_*` values.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── workspace/         # Overview, scenarios, compare, portfolio, signals, documents
│   ├── share/             # Read-only shared reports
│   ├── api/               # Company lookup, generation, health
│   └── globals.css        # Global styles
├── components/            # Product views and React Aria controls
├── data/                  # Company catalog, geography, industries, templates
└── lib/                   # Scenario engine, storage, schemas, report export
```

## Key Pages

### Home (`/`)

- Public product introduction
- Dynamic greeting flow with return-visitor behavior
- Direct entry into the workspace

### Create (`/workspace/scenarios/new`)

- Organization search or custom entry
- Industry and geography taxonomy
- Timeline horizon and structured decision brief
- Template-assisted authoring and clear progress states

### Workspace

- Library and scenario detail
- Side-by-side comparison
- Portfolio and signals
- Templates
- Custom document studio

## CI/CD Deployment

Pushing to `main` runs verification and deploys through Vercel:

1. GitHub Actions installs and verifies the app.
2. Vercel builds an immutable preview with runtime credentials supplied from Actions secrets.
3. The workflow checks runtime health.
4. The verified artifact is promoted to production.

See `.github/workflows/deploy-frontend.yml` for workflow details.

No user authentication is intentionally required for the current professor-facing deployment. Scenario history and portfolio data remain in the current browser.
