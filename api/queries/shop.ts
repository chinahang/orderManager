import { desc, eq } from "drizzle-orm";
import { getDb } from "./connection";
import { products, orders, orderItems, settings, itemNames, productNameMaps } from "../../db/schema";
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

function imagesDir() {
  const dbDir = resolve(process.env.SQLITE_PATH || "./data/app.db", "..");
  return resolve(dbDir, "images");
}

function sanitizedName(name: string) {
  return name.replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, "_").slice(0, 100);
}

/* ========== 品名 ↔ 图片 映射（多对多，管理员维护） ========== */

export async function listItemNameMappings() {
  const db = getDb();
  const names = await db.select().from(itemNames).orderBy(itemNames.name);
  const maps = await db.select().from(productNameMaps);
  const prods = await db.select({ id: products.id, name: products.name }).from(products);
  return names.map((n) => ({
    ...n,
    products: maps
      .filter((m) => m.itemNameId === n.id)
      .map((m) => prods.find((p) => p.id === m.productId))
      .filter((p): p is NonNullable<typeof p> => !!p),
  }));
}

export async function createItemName(name: string) {
  const db = getDb();
  const res = await db.insert(itemNames).values({ name }).onConflictDoNothing();
  return { id: Number(res.lastInsertRowid) };
}

export async function deleteItemName(id: number) {
  const db = getDb();
  await db.delete(productNameMaps).where(eq(productNameMaps.itemNameId, id));
  await db.delete(itemNames).where(eq(itemNames.id, id));
}

export async function setItemNameProducts(itemNameId: number, productIds: number[]) {
  const db = getDb();
  await db.delete(productNameMaps).where(eq(productNameMaps.itemNameId, itemNameId));
  if (productIds.length > 0) {
    await db.insert(productNameMaps).values(productIds.map((pid) => ({ itemNameId, productId: pid })));
  }
}

const SIZE_OPTIONS_KEY = "sizeOptions";
const DEFAULT_SIZE_OPTIONS = ["S", "M", "L", "XL", "XXL"];

export async function getSizeOptions(): Promise<string[]> {
  const rows = await getDb().select().from(settings).where(eq(settings.key, SIZE_OPTIONS_KEY));
  if (rows.length === 0) return DEFAULT_SIZE_OPTIONS;
  try {
    const v = JSON.parse(rows[0].value);
    return Array.isArray(v) && v.length > 0 ? v : DEFAULT_SIZE_OPTIONS;
  } catch {
    return DEFAULT_SIZE_OPTIONS;
  }
}

export async function setSizeOptions(options: string[]) {
  const db = getDb();
  const value = JSON.stringify(options);
  const rows = await db.select().from(settings).where(eq(settings.key, SIZE_OPTIONS_KEY));
  if (rows.length === 0) {
    await db.insert(settings).values({ key: SIZE_OPTIONS_KEY, value });
  } else {
    await db.update(settings).set({ value }).where(eq(settings.key, SIZE_OPTIONS_KEY));
  }
  return options;
}

export async function listProducts() {
  return getDb().select().from(products).orderBy(desc(products.createdAt));
}

export async function createProduct(data: { name: string; imageData: string; location?: string; available?: number }) {
  const db = getDb();
  // 先插入获取 ID
  const res = await db.insert(products).values({ name: data.name, imagePath: "", location: data.location ?? null, available: data.available ?? null });
  const id = Number(res.lastInsertRowid);
  // 保存图片文件
  const filename = `${id}_${sanitizedName(data.name)}.jpg`;
  const dir = imagesDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const base64 = data.imageData.replace(/^data:image\/[^;]+;base64,/, "");
  writeFileSync(resolve(dir, filename), Buffer.from(base64, "base64"));
  // 更新路径
  await db.update(products).set({ imagePath: filename }).where(eq(products.id, id));
  return { id };
}

export async function updateProduct(id: number, data: { location?: string; available?: number }) {
  const db = getDb();
  const set: Record<string, unknown> = {};
  if (data.location !== undefined) set.location = data.location;
  if (data.available !== undefined) set.available = data.available;
  if (Object.keys(set).length > 0) {
    await db.update(products).set(set).where(eq(products.id, id));
  }
}

export async function deleteProduct(id: number) {
  const db = getDb();
  const [p] = await db.select().from(products).where(eq(products.id, id));
  if (p?.imagePath) {
    const fp = resolve(imagesDir(), p.imagePath);
    if (existsSync(fp)) unlinkSync(fp);
  }
  await db.delete(products).where(eq(products.id, id));
}

export async function listOrders() {
  const db = getDb();
  const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
  const rows = await db
    .select({ item: orderItems, imagePath: products.imagePath, productName: products.name, productLocation: products.location })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .orderBy(orderItems.id);
  return allOrders.map((o) => ({
    ...o,
    items: rows
      .filter((r) => r.item.orderId === o.id)
      .map((r) => ({ ...r.item, imagePath: r.imagePath ?? null, productName: r.productName ?? null, productLocation: r.productLocation ?? null })),
  }));
}

export async function createOrder(data: {
  remark?: string;
  items: Array<{
    productId?: number;
    name: string;
    quantity: number;
    size?: string;
    remark?: string;
    itemDate?: string;
    shop?: string;
  }>;
}) {
  const db = getDb();
  const orderNo = "TD" + Date.now().toString();
  const res = await db.insert(orders).values({ orderNo, remark: data.remark ?? null });
  const orderId = Number(res.lastInsertRowid);
  if (data.items.length > 0) {
    await db.insert(orderItems).values(
      data.items.map((i) => ({
        orderId,
        productId: i.productId ?? null,
        name: i.name,
        quantity: i.quantity,
        size: i.size ?? null,
        remark: i.remark ?? null,
        itemDate: i.itemDate ?? null,
        shop: i.shop ?? null,
      }))
    );
  }
  return { id: orderId, orderNo };
}

export async function setItemDone(itemId: number, done: boolean, actualQuantity?: number) {
  await getDb()
    .update(orderItems)
    .set({ done, ...(actualQuantity !== undefined ? { actualQuantity } : {}) })
    .where(eq(orderItems.id, itemId));
}

export async function setItemActualQuantity(itemId: number, actualQuantity: number) {
  await getDb().update(orderItems).set({ actualQuantity }).where(eq(orderItems.id, itemId));
}

export async function deleteOrder(id: number) {
  const db = getDb();
  await db.delete(orderItems).where(eq(orderItems.orderId, id));
  await db.delete(orders).where(eq(orders.id, id));
}

export async function setOrderConfirmed(orderId: number, confirmed: boolean) {
  await getDb().update(orders).set({ confirmed }).where(eq(orders.id, orderId));
}
