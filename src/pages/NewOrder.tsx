import { useState } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { roleShopName, type Role } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, MousePointerClick, Plus, Trash2, Expand } from "lucide-react";
import { ZoomableImage, useLightbox, SelectionCarousel } from "@/components/ImageLib";
import { useI18n } from "@/i18n";

interface ItemRow {
  productId?: number;
  image?: string;
  name: string;
  quantity: number;
  size: string;
  remark: string;
  itemDate: string;
  shop: string;
}

const SHOW_COUNT = 8;

const emptyItem = (shop = ""): ItemRow => ({
  name: "",
  quantity: 1,
  size: "",
  remark: "",
  itemDate: new Date().toISOString().slice(0, 10),
  shop,
});

export default function NewOrderPage({ role }: { role: Role }) {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const { open: openLightbox } = useLightbox();
  const { data: products } = trpc.products.list.useQuery();
  const { data: sizeOptions } = trpc.settings.getSizeOptions.useQuery();
  const { data: mappings } = trpc.itemNames.listMappings.useQuery();
  const createMut = trpc.orders.create.useMutation({
    onSuccess: (r) => {
      toast.success(t("orderSubmitted") + r.orderNo);
      navigate("/process");
    },
    onError: (e) => toast.error(t("submitFailed") + e.message),
  });

  const [items, setItems] = useState<ItemRow[]>([]);
  const [orderRemark, setOrderRemark] = useState("");
  const [pickerGroupKey, setPickerGroupKey] = useState<string | null>(null);

  // 图片 → 品名 反查（一张图可对应多个品名，默认取第一个）
  function namesOfProduct(productId: number): string[] {
    return (mappings ?? []).filter((m) => m.products.some((p) => p.id === productId)).map((m) => m.name);
  }

  function addFromProduct(p: { id: number; name: string; imagePath: string }) {
    // 同一图片可多次点击，生成多条明细；品名按映射预填第一个，可在下拉中改
    const names = namesOfProduct(p.id);
    setItems((prev) => [
      ...prev,
      { ...emptyItem(roleShopName(role, lang)), productId: p.id, image: `/images/${p.imagePath}`, name: names[0] ?? "" },
    ]);
  }

  // 图库按映射分组：每个品名一组其映射图片；无映射的图片归入“未分组”
  const mappedProductIds = new Set((mappings ?? []).flatMap((m) => m.products.map((p) => p.id)));
  const productLookup = new Map(products?.map((p) => [p.id, p]) ?? []);
  const groups: Array<{ key: string; label: string; products: Array<{ id: number; name: string; imagePath: string; location: string | null; available: number | null }> }> = [
    ...(mappings ?? []).map((m) => ({
      key: `n-${m.id}`,
      label: m.name,
      products: m.products
        .map((p) => productLookup.get(p.id))
        .filter((p): p is NonNullable<typeof p> => !!p),
    })),
    ...(products?.some((p) => !mappedProductIds.has(p.id))
      ? [{ key: "unmapped", label: t("unmapped"), products: (products ?? []).filter((p) => !mappedProductIds.has(p.id)) }]
      : []),
  ];

  // 当前订单中各 productId 的数量（用于大图选品弹窗计数）
  const currentCounts = new Map<number, number>();
  for (const it of items) {
    if (it.productId) currentCounts.set(it.productId, (currentCounts.get(it.productId) ?? 0) + 1);
  }

  const pickerGroup = groups.find((g) => g.key === pickerGroupKey);

  function update(idx: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function submit() {
    if (items.length === 0) return toast.error(t("tapImagesFirst"));
    for (const it of items) {
      if (!it.name.trim()) return toast.error(t("nameRequired"));
    }
    createMut.mutate({
      remark: orderRemark || undefined,
      items: items.map((it) => ({
        productId: it.productId,
        name: it.name.trim(),
        quantity: it.quantity,
        size: it.size || undefined,
        remark: it.remark || undefined,
        itemDate: it.itemDate || undefined,
        shop: it.shop || undefined,
      })),
    });
  }

  const inputCls = "border-2 bg-secondary/50 font-medium";
  const shopName = roleShopName(role, lang);

  return (
    <div className="space-y-8">
      {/* 第一步：图库选品 */}
      <section className="dark-card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-base font-extrabold text-foreground">
          <MousePointerClick className="h-5 w-5 text-primary" />
          {t("step1")}
        </h2>
        {!products?.length ? (
          <p className="text-sm text-muted-foreground">{t("galleryEmptyHint")}</p>
        ) : (
          <div className="space-y-4">
            {groups.map((g) => {
              const images = g.products.map((pr) => ({ src: `/images/${pr.imagePath}`, title: pr.name }));
              return (
                <div key={g.key}>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-foreground">
                    <span className="h-3 w-1 rounded-full bg-primary" />
                    {g.label}
                    <button
                      onClick={() => setPickerGroupKey(g.key)}
                      className="ml-auto flex items-center gap-1 rounded-lg border-2 border-border px-2 py-0.5 text-xs font-bold text-muted-foreground transition-all hover:border-primary hover:text-primary"
                    >
                      <Expand className="h-3.5 w-3.5" />
                      {t("largeImagePick")}
                    </button>
                  </h3>
                  {/* 前 SHOW_COUNT 张图始终可见 */}
                  <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5 md:grid-cols-7 md:gap-4 lg:grid-cols-9">
                    {g.products.slice(0, SHOW_COUNT).map((p, idx) => {
                      const count = items.filter((i) => i.productId === p.id).length;
                      return (
                        <div
                          key={`${g.key}-${p.id}`}
                          className={`gallery-card group relative overflow-hidden rounded-xl border-2 transition-all ${
                            count > 0
                              ? "border-primary shadow-[0_0_18px_hsl(187_92%_45%/0.35)]"
                              : "border-border hover:border-primary/60"
                          }`}
                        >
                          <button
                            onClick={() => (count > 0 ? openLightbox(images, idx) : addFromProduct(p))}
                            className="block w-full"
                            title={p.name}
                          >
                            <div className="aspect-square overflow-hidden">
                              <img src={`/images/${p.imagePath}`} alt={p.name} className="gallery-img h-full w-full object-cover" />
                            </div>
                            <span className="absolute inset-x-0 bottom-0 border-t-2 border-border bg-background/85 px-1.5 py-1 text-center backdrop-blur-sm">
                              <span className="block truncate text-xs font-bold">{p.name}</span>
                              {p.location && (
                                <span className="block truncate text-[10px] text-muted-foreground">{p.location}</span>
                              )}
                            </span>
                            {count > 0 && (
                              <span className="absolute right-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-primary bg-primary px-1 text-xs font-extrabold text-primary-foreground">
                                {count}
                              </span>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {/* 超过 SHOW_COUNT 张时折叠剩余图片 */}
                  {g.products.length > SHOW_COUNT && (
                    <details className="group mt-2">
                      <summary className="flex cursor-pointer list-none justify-center text-xs font-bold text-primary hover:underline">
                        <span className="group-open:hidden">
                          {t("expandMore")} ({g.products.length - SHOW_COUNT})
                        </span>
                      </summary>
                      <div className="mt-2 grid grid-cols-4 gap-2.5 sm:grid-cols-5 md:grid-cols-7 md:gap-4 lg:grid-cols-9">
                        {g.products.slice(SHOW_COUNT).map((p, idx) => {
                          const actualIdx = idx + SHOW_COUNT;
                          const count = items.filter((i) => i.productId === p.id).length;
                          return (
                            <div
                              key={`${g.key}-${p.id}`}
                              className={`gallery-card group relative overflow-hidden rounded-xl border-2 transition-all ${
                                count > 0
                                  ? "border-primary shadow-[0_0_18px_hsl(187_92%_45%/0.35)]"
                                  : "border-border hover:border-primary/60"
                              }`}
                            >
                              <button
                                onClick={() => (count > 0 ? openLightbox(images, actualIdx) : addFromProduct(p))}
                                className="block w-full"
                                title={p.name}
                              >
                                <div className="aspect-square overflow-hidden">
                                  <img src={`/images/${p.imagePath}`} alt={p.name} className="gallery-img h-full w-full object-cover" />
                                </div>
                                <span className="absolute inset-x-0 bottom-0 border-t-2 border-border bg-background/85 px-1.5 py-1 text-center backdrop-blur-sm">
                                  <span className="block truncate text-xs font-bold">{p.name}</span>
                                  {p.location && (
                                    <span className="block truncate text-[10px] text-muted-foreground">{p.location}</span>
                                  )}
                                </span>
                                {count > 0 && (
                                  <span className="absolute right-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-primary bg-primary px-1 text-xs font-extrabold text-primary-foreground">
                                    {count}
                                  </span>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-2 flex justify-center">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            const details = e.currentTarget.closest("details");
                            if (details) details.open = false;
                          }}
                          className="text-xs font-bold text-muted-foreground hover:text-primary hover:underline"
                        >
                          {t("collapse")}
                        </button>
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 第二步：明细编辑 */}
      <section className="dark-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-foreground">{t("step2")}</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setItems((p) => [...p, emptyItem(shopName)])}
            className="border-2 font-bold"
          >
            <Plus className="mr-1 h-4 w-4" /> {t("addRow")}
          </Button>
        </div>
        <div className="space-y-3">
          {items.length === 0 && (
            <p className="rounded-lg border-2 border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              {t("noItems")}
            </p>
          )}
          {items.map((it, idx) => (
            <div
              key={idx}
              className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-border bg-secondary/30 p-3"
            >
              {it.image ? (
                <ZoomableImage
                  src={it.image}
                  title={it.name}
                  className="h-16 w-16 shrink-0 rounded-lg border-2 border-border"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground">
                  {t("noImage")}
                </div>
              )}
              {it.productId ? (
                <span className={`inline-flex w-full items-center truncate rounded-md border-2 bg-secondary/50 px-3 py-2 text-sm font-medium sm:w-40 ${inputCls}`}>
                  {it.name || "-"}
                </span>
              ) : (
                <Input className={`w-full sm:w-40 ${inputCls}`} placeholder={t("selectName")} value={it.name} onChange={(e) => update(idx, { name: e.target.value })} />
              )}
              <Input
                className={`w-[calc(33.3%-6px)] sm:w-20 ${inputCls}`}
                type="number"
                min={0}
                placeholder={t("qty")}
                value={it.quantity}
                onChange={(e) => update(idx, { quantity: Math.max(0, Number(e.target.value) || 0) })}
              />
              <Select value={it.size} onValueChange={(v) => update(idx, { size: v })}>
                <SelectTrigger className={`w-[calc(33.3%-6px)] sm:w-28 ${inputCls}`}>
                  <SelectValue placeholder={t("size")} />
                </SelectTrigger>
                <SelectContent className="border-2">
                  {(sizeOptions ?? []).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input className={`w-[calc(33.3%-6px)] sm:w-28 ${inputCls}`} placeholder={shopName} value={it.shop} onChange={(e) => update(idx, { shop: e.target.value })} />
              <Input className={`w-full sm:w-40 ${inputCls}`} type="date" value={it.itemDate} onChange={(e) => update(idx, { itemDate: e.target.value })} />
              <Input className={`min-w-32 flex-1 ${inputCls}`} placeholder={t("remark")} value={it.remark} onChange={(e) => update(idx, { remark: e.target.value })} />
              <Button variant="ghost" size="icon" onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}>
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          ))}
          <Textarea
            placeholder={t("orderRemarkPh")}
            value={orderRemark}
            onChange={(e) => setOrderRemark(e.target.value)}
            className={`mt-2 ${inputCls}`}
          />
        </div>
      </section>

      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={submit}
          disabled={createMut.isPending || items.length === 0}
          className="w-full border-2 border-primary px-8 font-extrabold shadow-[0_0_20px_hsl(187_92%_45%/0.35)] sm:w-auto"
        >
          {createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("submitBtn")}（{items.length} {t("itemsTotal")}）
        </Button>
      </div>

      {/* 大图选品轮播 */}
      {pickerGroup && (
        <SelectionCarousel
          open={pickerGroupKey !== null}
          onOpenChange={(v) => { if (!v) setPickerGroupKey(null); }}
          groupName={pickerGroup.label}
          images={pickerGroup.products.map((p) => ({ id: p.id, src: `/images/${p.imagePath}`, title: p.name }))}
          currentCounts={currentCounts}
          onAdd={(idx) => addFromProduct(pickerGroup.products[idx])}
        />
      )}
    </div>
  );
}
