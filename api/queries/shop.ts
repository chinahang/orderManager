import { desc, eq } from "drizzle-orm";
import { getDb } from "./connection";
import { products, orders, orderItems, settings, itemNames, productNameMaps } from "../../db/schema";

/* ========== 品名 ↔ 图片 映射（多对多，管理员维护） ========== */

export async function listItemNameMappings() {
  const db = getDb();
  const names = await db.select().from(itemNames).orderBy(itemNames.name);
  const maps = await db.select().from(productNameMaps);
  const prods = await db.select({ id: products.id, name: products.name, imageData: products.imageData }).from(products);
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

export async function createProduct(data: { name: string; imageData: string }) {
  const db = getDb();
  const res = await db.insert(products).values(data);
  return { id: Number(res.lastInsertRowid) };
}

export async function deleteProduct(id: number) {
  await getDb().delete(products).where(eq(products.id, id));
}

export async function listOrders() {
  const db = getDb();
  const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
  const rows = await db
    .select({ item: orderItems, imageData: products.imageData, productName: products.name })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .orderBy(orderItems.id);
  return allOrders.map((o) => ({
    ...o,
    items: rows
      .filter((r) => r.item.orderId === o.id)
      .map((r) => ({ ...r.item, imageData: r.imageData ?? null, productName: r.productName ?? null })),
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
