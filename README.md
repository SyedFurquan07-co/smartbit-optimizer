# Smartbit Optimizer

**Smartbit Optimizer** is an AI-assisted workspace for generating
proposals and analyzing PDF documents. It combines proposal generation
with a PDF Intelligence workspace for summaries, findings, risks, and
recommendations.

> **Status:** Under active development. Verify configuration and
> deployment steps against your current Supabase project before using
> production data.

## Features

### AI proposal generation

-   Generate structured proposals through the existing
    proposal-generation workflow.
-   View saved proposals through proposal history and details.
-   Use existing analysis and revision features where available.

### PDF Intelligence

-   Upload PDFs and select a category to guide analysis:
    -   Business Proposal
    -   Research Paper
    -   Technical Manual
    -   Legal Contract
    -   Analytical Report
    -   General Document
-   Extract text in page order and provide page references where
    supported by the source.
-   Generate an executive summary, key findings, detailed analysis,
    risks, gaps, and recommendations.
-   Copy analysis content and export a formatted report.
-   Reopen saved analyses from document history.

**Reported PDF limits:** The implementation report describes a 25 MB
maximum file size and a 50-page limit. Scanned/image-only PDFs require
OCR; if OCR is not configured, the app should explain that limitation
rather than pretend to extract text.

### Accounts and data

-   Supabase Authentication for user sessions.
-   User-scoped database access protected by Row-Level Security (RLS).
-   Saved proposal and uploaded-document workflows.
-   An authenticated Supabase Edge Function for PDF analysis.

## Technology stack

-   **Frontend:** React, TypeScript, Vite
-   **Styling:** Custom Premium Dark UI
-   **Authentication and database:** Supabase Auth and PostgreSQL
-   **Server-side functions:** Supabase Edge Functions
-   **PDF text extraction:** `pdfjs-dist`
-   **AI provider:** OpenRouter, called from a server-side Edge Function

The PDF analysis function is separate from proposal generation. The
project also contains a client-side fallback analysis path. Fallback
output may not be equivalent to a live LLM response; the UI should
identify the analysis source where possible.

## Architecture

``` text
Browser (React + TypeScript)
        |
        | Authenticated requests
        v
Supabase
  ├── Auth
  ├── PostgreSQL + Row-Level Security
  ├── Proposal-generation Edge Function
  └── PDF-analysis Edge Function
              |
              | Server-side API request
              v
          OpenRouter
```

PDF workflow: 1. The user selects a PDF and document category. 2. The
frontend validates the file and extracts available text page by page. 3.
The authenticated PDF-analysis Edge Function validates the request and
calls the configured AI provider. 4. The application displays structured
results and saves the document/analysis through its configured
persistence workflow. 5. The user can reopen saved records through
history.

Exact persistence behavior depends on which database migrations have
been applied to the target Supabase project.

## Prerequisites

-   Node.js and npm compatible with the project's dependencies.
-   A Supabase project.
-   Supabase CLI for Edge Function deployment and database migrations.
-   An OpenRouter API key for live cloud AI analysis.

## Local setup

### 1. Clone the repository

``` bash
git clone <YOUR_GIT_REPOSITORY_URL>
cd smartbit-optimizer
```

Replace `<YOUR_GIT_REPOSITORY_URL>` with your repository URL.

### 2. Install dependencies

``` bash
npm install
```

### 3. Configure frontend environment variables

Create a local environment file from the supplied example:

``` powershell
Copy-Item .env.example .env.local
```

Fill in the values documented in `.env.example` and the project's
Supabase client configuration. Never commit `.env.local`.

**Never put `OPENROUTER_API_KEY` in a `VITE_` variable or other
browser-exposed frontend variable.** The key belongs in Supabase Edge
Function Secrets.

### 4. Configure Supabase

Verify that the frontend Supabase URL and public/publishable key point
to the intended project. The project reference used during development
is:

``` text
lorlldufubbawqvcuslg
```

Verify this reference before deploying to any environment.

``` bash
npx supabase login
npx supabase link --project-ref lorlldufubbawqvcuslg
```

### 5. Review and apply database migrations

Review the files in `supabase/migrations/`, especially the
document-analysis schema and secure proposal-counter RPC migration.
Confirm the current remote schema and whether each migration has already
been applied.

Only after reviewing the pending migration list and confirming the
target project, use the project's normal migration workflow, for
example:

``` bash
npx supabase db push
```

Do not blindly apply migrations to production.

### 6. Configure Edge Function secrets

Set the genuine OpenRouter API key as a Supabase secret. Replace the
placeholder locally; never commit a real key into documentation,
scripts, or source code.

``` bash
npx supabase secrets set OPENROUTER_API_KEY=<YOUR_REAL_OPENROUTER_API_KEY> --project-ref lorlldufubbawqvcuslg
```

Confirm the secret is configured in the intended project without
printing its value. Use a safe secret-entry method if your shell history
is shared or logged.

### 7. Deploy Edge Functions

After reviewing the code and confirming the required schema and secrets
are configured:

``` bash
npx supabase functions deploy generate-proposal --project-ref lorlldufubbawqvcuslg
npx supabase functions deploy analyze-pdf --project-ref lorlldufubbawqvcuslg
```

Deploy only the functions you intend to update, and verify the project
reference first.

### 8. Start the development server

``` bash
npm run dev
```

Open the local URL printed by Vite.

## Quality checks

``` bash
npx tsc --noEmit
npm run build
```

A successful build verifies compilation and bundling. It does **not**
prove that remote AI requests, database writes, RLS policies, or
production authentication work correctly.

## Recommended manual tests

Before production deployment, verify with an authenticated test account:

1.  Sign up, sign in, refresh, and sign out.
2.  Generate a proposal using the live generation function.
3.  Confirm the proposal is saved and can be reopened.
4.  Upload a valid text-based PDF and run analysis.
5.  Confirm the summary and findings reflect the actual PDF.
6.  Test malformed, empty, encrypted, oversized, and over-limit PDFs.
7.  Confirm scanned PDFs are handled honestly when OCR is unavailable.
8.  Reopen a saved analysis after refreshing the page.
9.  Verify a second user cannot read, update, or delete the first user's
    records.
10. Test AI errors, timeouts, and persistence failures; the UI must not
    claim a save succeeded if it failed.
11. Verify proposal counters follow their defined semantics.
12. Inspect the production bundle for exposed server-side API keys.

## Security notes

-   Keep OpenRouter credentials in Supabase Edge Function Secrets.
-   Never commit `.env`, `.env.local`, or files containing credentials.
-   Keep RLS enabled and verify ownership policies for every user-owned
    table.
-   Authenticate Edge Function requests and validate inputs server-side.
-   Treat PDF text as untrusted input; embedded instructions must not
    override system or security instructions.
-   Enforce upload size, page-count, text-length, and request-time
    limits.
-   Avoid logging API keys, access tokens, or full sensitive document
    contents.
-   Review database migrations and RLS policies before production use.

## Repository structure

``` text
smartbit-optimizer/
├── components/
│   ├── AppShell.tsx
│   ├── AuthCard.tsx
│   ├── Dashboard.tsx
│   ├── PdfAnalysisResults.tsx
│   ├── PdfWorkspace.tsx
│   ├── ProposalDetails.tsx
│   ├── ProposalGenerator.tsx
│   ├── ProposalHistory.tsx
│   └── ProposalUpload.tsx
├── scripts/
├── supabase/
│   ├── functions/
│   │   ├── analyze-pdf/
│   │   └── generate-proposal/
│   └── migrations/
├── test_docs/
├── utils/
│   ├── pdfAnalyzer.ts
│   └── pdfExtractor.ts
├── .env.example
├── App.tsx
├── index.css
├── index.html
├── index.tsx
├── package.json
├── tsconfig.json
└── types.ts
```

This structure reflects the files reported during development; the
repository may contain additional files.

## Known limitations

-   Scanned/image-only PDFs require OCR; text extraction alone cannot
    read text embedded only in images.
-   AI output can be incomplete or incorrect. Check factual claims and
    page references against the source.
-   Rule-based fallback output is not equivalent to live LLM analysis
    and should be identified clearly.
-   Production readiness requires live tests of Edge Functions, database
    persistence, RLS isolation, and error handling.

## License

No license has been specified. Add a `LICENSE` file before describing
this project as open source.
