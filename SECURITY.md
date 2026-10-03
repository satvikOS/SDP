# Security policy

## Credential rules

- Provider credentials belong in GitHub Actions secrets only.
- The application uses the exact secret names `XAI_API`, `GEMINI_API`, and `OPENAI_API`.
- Never commit `.env`, `.env.local`, credential exports, provider responses containing keys, or Vercel project metadata.
- Never prefix a credential with `NEXT_PUBLIC_`.
- Do not log prompts, generated briefs, authorization headers, or provider response bodies in production.

## Exposed legacy credential

A Google-style API key existed in historical source and documentation. Removal from the current branch does not invalidate the value in Git history. The owner must revoke and rotate it before deployment. History rewriting is optional defense-in-depth after rotation and requires coordination with all clones and integrations.

## Reporting

Do not open a public issue for a vulnerability or exposed credential. Contact the repository owner privately with the affected path, commit, impact, and reproduction steps. Do not include a live secret in the report.

## Required production controls

Before public access, add authentication, authorization, durable rate limits, tenant isolation, provider budget caps, audit events, and abuse monitoring. The current API input limits reduce accidental overload but are not a substitute for these controls.
