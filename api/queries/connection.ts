// better-sqlite3 是原生模块，必须运行时加载、不能被 esbuild 打包。
// 开发环境（vite/tsx）为纯 ESM，用 createRequire；
// 生产构建产物中 esbuild banner 已注入 createRequire，同样可用。
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const createRequire: ((url: string) => NodeRequire) | undefined;
const req: NodeRequire =
  typeof createRequire !== "undefined"
    ? createRequire(import.meta.url)
    : (await import("node:module")).createRequire(import.meta.url);
const Database = req("better-sqlite3") as typeof import("better-sqlite3");
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@db/schema";
import * as relations from "@db/relations";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const fullSchema = { ...schema, ...relations };

// SQLite 数据库文件路径（默认 ./data/app.db，可用 SQLITE_PATH 覆盖）
const dbPath = resolve(process.env.SQLITE_PATH || "./data/app.db");

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;

const DDL = `
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  image_data TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT NOT NULL UNIQUE,
  remark TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS item_names (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE TABLE IF NOT EXISTS product_name_maps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_name_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  actual_quantity INTEGER,
  size TEXT,
  remark TEXT,
  item_date TEXT,
  shop TEXT,
  done INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
`;

export function getDb() {
  if (!instance) {
    if (!existsSync(dirname(dbPath))) mkdirSync(dirname(dbPath), { recursive: true });
    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.exec(DDL);
    instance = drizzle(sqlite, { schema: fullSchema });
  }
  return instance;
}
