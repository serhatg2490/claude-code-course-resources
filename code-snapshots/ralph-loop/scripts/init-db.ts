import { closeDb, getDb, query } from '../lib/db';

const dbPath = process.env.DATABASE_PATH ?? 'data/app.db';

// getDb() creates the file (and its directory) if needed and applies the schema.
getDb();

const tables = query<{ name: string }>(
  "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
).map((table) => table.name);

console.log(`Initialized ${dbPath} with tables: ${tables.join(', ')}`);
closeDb();
