import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// 商品图片库
export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  imagePath: text("image_path").notNull(), // 图片文件路径
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// 提单
export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderNo: text("order_no").notNull().unique(),
  remark: text("remark"),
  confirmed: integer("confirmed", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// 品名（管理员维护，与商品图片多对多映射）
export const itemNames = sqliteTable("item_names", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// 品名 ↔ 商品图片 映射（多对多）
export const productNameMaps = sqliteTable("product_name_maps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemNameId: integer("item_name_id").notNull(),
  productId: integer("product_id").notNull(),
});

// 系统设置（尺寸选项等，由仓库管理员维护）
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(), // JSON 字符串
});

// 提单明细
export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id"),
  name: text("name").notNull(), // 品名
  quantity: integer("quantity").notNull().default(1), // 申报数量
  actualQuantity: integer("actual_quantity"), // 实际数量(仓库处理时填写)
  size: text("size"), // 尺寸
  remark: text("remark"), // 备注
  itemDate: text("item_date"), // 日期
  shop: text("shop"), // 店铺
  done: integer("done", { mode: "boolean" }).notNull().default(false), // 明细处理状态
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
