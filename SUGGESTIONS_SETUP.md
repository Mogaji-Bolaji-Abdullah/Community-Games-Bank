# Suggestion intake setup

The public website form submits to `/api/suggest`. Visitors do not need GitHub accounts. Each valid submission is committed as a Markdown file under `suggestions/inbox/` for maintainers to review.

## Required Vercel environment variable

Add `GITHUB_TOKEN` to the Community Games Bank Vercel project for Production (and Preview if you want preview submissions). Use a fine-grained GitHub personal access token scoped only to this repository, with **Contents: Read and write** permission. Never place this token in browser code or commit it to the repository.

Optional environment variables:
- `GITHUB_OWNER` (defaults to `Mogaji-Bolaji-Abdullah`)
- `GITHUB_REPO` (defaults to `Community-Games-Bank`)

After adding the variable, redeploy the project. The function validates required fields and uses a honeypot field for basic bot filtering. Before broad public promotion, add persistent rate limiting or CAPTCHA.
