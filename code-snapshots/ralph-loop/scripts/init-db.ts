import { Database } from 'bun:sqlite';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { migrate } from '../lib/schema';

const dbPath = process.env.DATABASE_PATH ?? 'data/app.db';

await mkdir(dirname(dbPath), { recursive: true });

const db = new Database(dbPath, { create: true, strict: true });
db.exec('PRAGMA journal_mode = WAL;');
migrate(db);

const tables = db
  .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
  .all()
  .map((table) => table.name);

console.log(`Initialized ${dbPath} with tables: ${tables.join(', ')}`);
db.close();
