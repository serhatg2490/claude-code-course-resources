# CLAUDE.md

We're building the app described in @SPEC.MD. Read that file for general architectural tasks or to double-check the exact database structure, tech stack or application architecture.

Keep your replies extremely concise and focus on conveying the key information. No unnecessary fluff, no long code snippets.

Whenever working with any third-party library or something similar, you MUST look up the official documentation to ensure that you're working with up-to-date information.
Use the DocsExplorer subagent for efficient documentation lookup.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install      # Install dependencies
bun dev          # Dev server on http://localhost:3000
bun run build    # Production build (also the fastest full type-check)
bun start        # Serve the production build
bun run lint     # ESLint (flat config, next/core-web-vitals + next/typescript)
bun run test     # Vitest unit tests (tests/); test:watch for watch mode
```

Tests use Vitest, never Bun's built-in runner: always `bun run test`, not `bun test`. Tests live in `tests/`, mirroring the source tree. Component tests opt into jsdom with `// @vitest-environment jsdom`. `bun:sqlite` isn't available under Vitest, so DB tests mock `@/lib/db` with the in-memory `node:sqlite` helper in `tests/helpers/sqlite-db.ts`.

## Architecture

This is a Next.js 16 application using the App Router pattern with:
— **Package Manager**: Bun (bun.lock present)
— **TypeScript**: Strict mode enabled
— **Styling**: Tailwind CSS 4 with PostCSS
— **React**: Version 19

### Key Dependencies

— `@tiptap/*` — Rich text editor components
— `better-auth` — Authentication library
— `zod` — Schema validation

### Project Structure

— `app/` — Next.js App Router pages and layouts
— `@/*` — path alias maps to project root
