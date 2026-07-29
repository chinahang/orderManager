import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import {
  listProducts,
  createProduct,
  deleteProduct,
  listOrders,
  createOrder,
  setItemDone,
  setItemActualQuantity,
  getSizeOptions,
  setSizeOptions,
  listItemNameMappings,
  createItemName,
  deleteItemName,
  setItemNameProducts,
  deleteOrder,
} from "./queries/shop";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),

  products: createRouter({
    list: publicQuery.query(() => listProducts()),
    create: publicQuery
      .input(z.object({ name: z.string().min(1).max(255), imageData: z.string().min(1) }))
      .mutation(({ input }) => createProduct(input)),
    delete: publicQuery
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteProduct(input.id)),
  }),

  orders: createRouter({
    list: publicQuery.query(() => listOrders()),
    create: publicQuery
      .input(
        z.object({
          remark: z.string().optional(),
          items: z
            .array(
              z.object({
                productId: z.number().optional(),
                name: z.string().min(1).max(255),
                quantity: z.number().int().min(1),
                size: z.string().max(100).optional(),
                remark: z.string().optional(),
                itemDate: z.string().max(20).optional(),
                shop: z.string().max(255).optional(),
              })
            )
            .min(1),
        })
      )
      .mutation(({ input }) => createOrder(input)),
    setItemDone: publicQuery
      .input(z.object({ itemId: z.number(), done: z.boolean(), actualQuantity: z.number().int().min(0).optional() }))
      .mutation(({ input }) => setItemDone(input.itemId, input.done, input.actualQuantity)),
    setItemActualQuantity: publicQuery
      .input(z.object({ itemId: z.number(), actualQuantity: z.number().int().min(0) }))
      .mutation(({ input }) => setItemActualQuantity(input.itemId, input.actualQuantity)),
    delete: publicQuery
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteOrder(input.id)),
  }),

  settings: createRouter({
    getSizeOptions: publicQuery.query(() => getSizeOptions()),
    setSizeOptions: publicQuery
      .input(z.object({ options: z.array(z.string().min(1).max(50)).min(1).max(50) }))
      .mutation(({ input }) => setSizeOptions(input.options)),
  }),

  itemNames: createRouter({
    listMappings: publicQuery.query(() => listItemNameMappings()),
    create: publicQuery
      .input(z.object({ name: z.string().min(1).max(255) }))
      .mutation(({ input }) => createItemName(input.name)),
    delete: publicQuery
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteItemName(input.id)),
    setProducts: publicQuery
      .input(z.object({ itemNameId: z.number(), productIds: z.array(z.number()).max(200) }))
      .mutation(({ input }) => setItemNameProducts(input.itemNameId, input.productIds)),
  }),
});

export type AppRouter = typeof appRouter;
