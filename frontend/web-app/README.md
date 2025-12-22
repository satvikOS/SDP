# AI Foresight Platform - Web Application

Next.js 14 frontend for the AI-Driven Strategic Foresight Platform.

## Features

- **Scenario Generation Interface**: Interactive form to generate scenario sets
- **Real-time Progress Tracking**: Live updates during scenario generation (2-5 minutes)
- **Scenario Visualization**: View generated scenarios with narratives, signposts, and actions
- **Cost Tracking**: Track API costs per scenario generation
- **Responsive Design**: Works on iPad Pro and all modern browsers
- **Dark Mode Support**: Automatic dark/light theme switching

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Deployment**: AWS S3 + CloudFront (via GitHub Actions)

## API Integration

Connects to AWS Lambda backend via REST API:
- `/health` - Health check
- `/agents` - List available agents
- `/execute` - Execute single agent
- `/generate-scenarios` - Full scenario generation pipeline

## Local Development

```bash
# Install dependencies
npm install

# Set API endpoint
echo "NEXT_PUBLIC_API_URL=https://your-api.execute-api.us-east-1.amazonaws.com" > .env.local

# Run development server
npm run dev

# Open http://localhost:3000
```

## Build & Deploy

```bash
# Build for production (static export)
npm run build

# Test production build locally
npm start

# Or use GitHub Actions (auto-deploy on push)
# Push to main or claude/ai-foresight-platform-yEVtZ branch
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Lambda API endpoint | `https://abc123.execute-api.us-east-1.amazonaws.com` |

**Note:** Set `NEXT_PUBLIC_API_URL` as GitHub Secret for CI/CD deployment.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── scenarios/
│   │   ├── page.tsx       # Scenario library
│   │   └── new/
│   │       └── page.tsx   # Scenario generation form
│   └── globals.css        # Global styles
├── lib/
│   ├── api-client.ts      # Lambda API client
│   └── utils.ts           # Utility functions
└── components/            # Reusable components (future)
```

## Key Pages

### Home (`/`)
- Platform overview
- System architecture info
- Quick links to generate scenarios
- API health status indicator

### Generate Scenarios (`/scenarios/new`)
- Interactive form (Industry, Region, Horizon)
- Real-time generation progress (7 AI agents)
- Results display with scenarios, actions, quality scores
- Cost and time tracking

### Scenario Library (`/scenarios`)
- List of all generated scenario sets (future: DynamoDB integration)
- Filter by industry, region, date
- View scenario details

## CI/CD Deployment

Automatically deploys to AWS S3 + CloudFront when you push to GitHub:

1. Push changes to `main` or `claude/ai-foresight-platform-yEVtZ`
2. GitHub Actions builds Next.js app
3. Deploys to S3 bucket
4. Invalidates CloudFront cache (production only)

See `.github/workflows/deploy-frontend.yml` for workflow details.

## Cost

**Development:** Free (local or GitHub Pages)
**Production:** ~$1-2/month (S3 + CloudFront)

## Next Steps

- [ ] Add persistent storage (DynamoDB integration for scenario history)
- [ ] Add authentication (Cognito)
- [ ] Add visualization components (scenario matrices, trend radars)
- [ ] Add export functionality (PDF, PowerPoint)
- [ ] Add real-time monitoring dashboard (signpost tracking)
- [ ] Add collaboration features (comments, sharing)

---

**Auto-deployed via GitHub Actions** 🚀
