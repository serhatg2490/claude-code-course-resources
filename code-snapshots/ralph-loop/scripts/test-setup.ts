// Preloaded by `bun test` (see bunfig.toml). Modules that open the shared connection at import time
// (e.g. `lib/auth.ts`) must never touch the real `data/app.db` during tests.
process.env.DATABASE_PATH ??= ':memory:';
