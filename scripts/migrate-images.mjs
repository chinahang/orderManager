#!/usr/bin/env node
/**
 * 迁移脚本：将 products 表中 base64 图片数据提取为文件
 * 用法: node scripts/migrate-images.mjs [db-path]
 * 默认: ./data/app.db
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const dbPath = resolve(process.argv[2] || process.env.SQLITE_PATH || "./data/app.db");
const imagesDir = resolve(dbPath, "..", "images");

if (!existsSync(dbPath)) {
  console.error(`数据库不存在: ${dbPath}`);
  process.exit(1);
}

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

// 检查列名
const cols = sqlite.prepare("PRAGMA table_info(products)").all().map((r) => r.name);
const colName = cols.includes("image_data") ? "image_data" : cols.includes("image_path") ? "image_path" : null;
if (!colName) {
  console.error("products 表中找不到 image_data 或 image_path 列");
  process.exit(1);
}

console.log(`使用列: ${colName}`);

// 读取所有商品
const rows = sqlite.prepare(`SELECT id, name, ${colName} as imageData FROM products`).all();
console.log(`共 ${rows.length} 个商品`);

if (!existsSync(imagesDir)) mkdirSync(imagesDir, { recursive: true });

let migrated = 0;
const update = sqlite.prepare(`UPDATE products SET ${colName} = ? WHERE id = ?`);

for (const row of rows) {
  const val = row.imageData;
  if (!val || typeof val !== "string") continue;

  // 已经是文件路径（不是 base64）则跳过
  if (!val.startsWith("data:image")) {
    console.log(`  [跳过] id=${row.id} name=${row.name} 已是文件路径`);
    continue;
  }

  // 提取 base64 数据
  const base64 = val.replace(/^data:image\/[^;]+;base64,/, "");
  const sanitizedName = row.name.replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, "_").slice(0, 100);
  const filename = `${row.id}_${sanitizedName}.jpg`;
  const filePath = resolve(imagesDir, filename);

  writeFileSync(filePath, Buffer.from(base64, "base64"));
  update.run(filename, row.id);
  migrated++;
  console.log(`  [完成] id=${row.id} name=${row.name} → ${filename}`);
}

// 如果列名是 image_data，重命名为 image_path
if (colName === "image_data") {
  try {
    sqlite.exec("ALTER TABLE products RENAME COLUMN image_data TO image_path");
    console.log("已重命名列: image_data → image_path");
  } catch (e) {
    console.log("列重命名跳过（可能已重命名）:", e.message);
  }
}

sqlite.close();
console.log(`\n迁移完成: ${migrated}/${rows.length} 个商品已迁移`);
