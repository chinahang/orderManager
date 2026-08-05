import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

// 图片静态文件服务
const IMAGES_DIR = resolve(process.env.SQLITE_PATH || "./data/app.db", "..", "images");
const MIME: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" };
app.get("/images/:filename", (c) => {
  const fp = resolve(IMAGES_DIR, c.req.param("filename"));
  if (!existsSync(fp)) return c.notFound();
  const ext = fp.slice(fp.lastIndexOf(".")).toLowerCase();
  return c.body(readFileSync(fp), 200, { "Content-Type": MIME[ext] ?? "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable" });
});
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
