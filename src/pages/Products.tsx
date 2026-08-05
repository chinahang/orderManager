import { useMemo, useRef, useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ImagePlus, Link2, Loader2, Ruler, Trash2, Upload, X, ZoomIn } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { fileToDataUrl, ZoomableImage, type LightboxImage, useLightbox } from "@/components/ImageLib";
import { useI18n } from "@/i18n";

export default function ProductsPage() {
  const utils = trpc.useUtils();
  const { t } = useI18n();
  const { data: products, isLoading } = trpc.products.list.useQuery();
  const { open: openLightbox } = useLightbox();
  const productImageMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of products ?? []) map.set(p.id, p.imageData);
    return map;
  }, [products]);
  const createMut = trpc.products.create.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate();
      toast.success(t("productAdded"));
    },
    onError: (e) => toast.error(t("addFailed") + e.message),
  });
  const deleteMut = trpc.products.delete.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate();
      toast.success(t("deleted"));
    },
  });

  // 尺寸选项设置（仓库管理员）
  const { data: sizeOptions } = trpc.settings.getSizeOptions.useQuery();
  const [newSize, setNewSize] = useState("");
  const sizeMut = trpc.settings.setSizeOptions.useMutation({
    onSuccess: () => {
      utils.settings.getSizeOptions.invalidate();
      toast.success(t("sizeSaved"));
    },
    onError: (e) => toast.error(t("sizeSaveFailed") + e.message),
  });

  function saveSizes(options: string[]) {
    sizeMut.mutate({ options });
  }

  function addSize() {
    const v = newSize.trim();
    if (!v) return;
    const current = sizeOptions ?? [];
    if (current.includes(v)) return toast.info(t("sizeExists"));
    saveSizes([...current, v]);
    setNewSize("");
  }

  // ===== 品名 ↔ 图片映射（管理员） =====
  const { data: mappings } = trpc.itemNames.listMappings.useQuery();
  const [newName, setNewName] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const nameCreateMut = trpc.itemNames.create.useMutation({
    onSuccess: () => {
      utils.itemNames.listMappings.invalidate();
      toast.success(t("itemNameAdded"));
    },
  });
  const nameDeleteMut = trpc.itemNames.delete.useMutation({
    onSuccess: () => {
      utils.itemNames.listMappings.invalidate();
      toast.success(t("itemNameDeleted"));
    },
  });
  const mapMut = trpc.itemNames.setProducts.useMutation({
    onSuccess: () => {
      utils.itemNames.listMappings.invalidate();
      toast.success(t("mappingSaved"));
    },
  });

  function addName() {
    const v = newName.trim();
    if (!v) return;
    if ((mappings ?? []).some((m) => m.name === v)) return toast.info(t("nameExists"));
    nameCreateMut.mutate({ name: v });
    setNewName("");
  }

  function toggleMap(itemNameId: number, productId: number, currentIds: number[]) {
    const next = currentIds.includes(productId)
      ? currentIds.filter((x) => x !== productId)
      : [...currentIds, productId];
    // ponytail: optimistic update, no await
    utils.itemNames.listMappings.setData(undefined, (old) =>
      old?.map((m) =>
        m.id === itemNameId
          ? {
              ...m,
              products: currentIds.includes(productId)
                ? m.products.filter((p) => p.id !== productId)
                : [...m.products, { id: productId, name: products?.find((p) => p.id === productId)?.name ?? "" }],
            }
          : m,
      ),
    );
    mapMut.mutate({ itemNameId, productIds: next });
  }

  const [name, setName] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setPreview(await fileToDataUrl(file));
      toast.success(t("imageRead"));
    } catch {
      toast.error(t("imageReadFail"));
    }
  }

  async function onUpload() {
    if (!name.trim()) return toast.error(t("enterName"));
    if (!preview) return toast.error(t("chooseImage"));
    await createMut.mutateAsync({ name: name.trim(), imageData: preview });
    setName("");
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  const lightboxImages: LightboxImage[] =
    products?.map((p) => ({ src: p.imageData, title: p.name })) ?? [];

  return (
    <div className="space-y-8">
      {/* 上传卡片 */}
      <section className="dark-card p-5">
        <div
          className="flex flex-wrap items-end gap-4"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onUpload();
            }
          }}
        >
          <div className="min-w-52 flex-1 space-y-2">
            <label className="text-sm font-bold text-foreground">{t("productName")}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("productNamePh")}
              className="border-2 bg-secondary/50 font-medium"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">{t("productImage")}</label>
            <Input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="w-full border-2 bg-secondary/50 sm:w-72"
            />
          </div>
          {preview && (
            <div className="overflow-hidden rounded-lg border-2 border-primary">
              <img src={preview} alt="preview" className="h-20 w-20 object-cover" />
            </div>
          )}
          <Button
            onClick={onUpload}
            disabled={createMut.isPending}
            className="w-full border-2 border-primary font-bold shadow-[0_0_16px_hsl(187_92%_45%/0.3)] sm:w-auto"
          >
            {createMut.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-1 h-4 w-4" />
            )}
            {t("addProduct")}
          </Button>
        </div>
      </section>

      {/* 尺寸选项设置（仓库管理员） */}
      <section className="dark-card p-5">
        <h2 className="mb-1 flex items-center gap-2 text-base font-extrabold text-foreground">
          <Ruler className="h-5 w-5 text-primary" />
          {t("sizeSettings")}
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">{t("sizeSettingsDesc")}</p>
        <div className="flex flex-wrap items-center gap-2">
          {(sizeOptions ?? []).map((s) => (
            <span
              key={s}
              className="flex items-center gap-1.5 rounded-lg border-2 border-border bg-secondary px-3 py-1.5 text-sm font-bold text-foreground"
            >
              {s}
              <button
                onClick={() => saveSizes((sizeOptions ?? []).filter((x) => x !== s))}
                className="text-muted-foreground transition-colors hover:text-destructive"
                title={t("delete")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          <div className="flex items-center gap-2">
            <Input
              value={newSize}
              onChange={(e) => setNewSize(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSize())}
              placeholder={t("addSizePh")}
              className="w-44 border-2 bg-secondary/50 font-medium"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={addSize}
              disabled={sizeMut.isPending}
              className="border-2 font-bold"
            >
              {t("add")}
            </Button>
          </div>
        </div>
      </section>

      {/* 品名 ↔ 图片映射（管理员） */}
      <section className="dark-card p-5">
        <h2 className="mb-1 flex items-center gap-2 text-base font-extrabold text-foreground">
          <Link2 className="h-5 w-5 text-primary" />
          {t("itemNameMapping")}
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">{t("mappingDesc")}</p>

        {/* 添加品名 */}
        <div className="mb-4 flex items-center gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addName())}
            placeholder={t("newItemNamePh")}
            className="w-64 border-2 bg-secondary/50 font-medium"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={addName}
            disabled={nameCreateMut.isPending}
            className="border-2 font-bold"
          >
            {t("add")}
          </Button>
        </div>

        {/* 品名列表 + 映射图片 */}
        {!mappings?.length ? (
          <p className="rounded-lg border-2 border-dashed border-border py-6 text-center text-sm text-muted-foreground">
            {t("noItemNames")}
          </p>
        ) : (
          <div className="space-y-3">
            {mappings.map((m) => {
              const expanded = expandedId === m.id;
              const currentIds = m.products.map((p) => p.id);
              return (
                <div key={m.id} className="rounded-xl border-2 border-border bg-secondary/30 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-extrabold text-foreground">{m.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {currentIds.length} {t("linkedImages")}
                    </span>
                    <span className="flex-1" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedId(expanded ? null : m.id)}
                      className="border-2 font-bold"
                    >
                      {t("pickImages")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => nameDeleteMut.mutate({ id: m.id })}
                      title={t("delete")}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* 已映射图片预览 */}
                  {currentIds.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.products.map((p) => (
                        <img
                          key={p.id}
                          src={productImageMap.get(p.id)}
                          alt={p.name}
                          title={p.name}
                          className="h-12 w-12 rounded-lg border-2 border-primary/50 object-cover"
                        />
                      ))}
                    </div>
                  )}

                  {/* 展开：勾选图片 */}
                  {expanded && (
                    <div className="mt-3 grid grid-cols-4 gap-2 border-t-2 border-border/60 pt-3 sm:grid-cols-6 md:grid-cols-8">
                      {(products ?? []).map((p) => {
                        const checked = currentIds.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            onClick={() => toggleMap(m.id, p.id, currentIds)}
                            className={`relative overflow-hidden rounded-lg border-2 transition-all ${
                              checked
                                ? "border-primary shadow-[0_0_12px_hsl(187_92%_45%/0.35)]"
                                : "border-border opacity-60 hover:opacity-100"
                            }`}
                            title={p.name}
                          >
                            <img src={p.imageData} alt={p.name} className="aspect-square w-full object-cover" />
                            <span className="absolute left-1 top-1">
                              <Checkbox
                                checked={checked}
                                className="pointer-events-none h-4 w-4 border-2 bg-background/70 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                              />
                            </span>
                            <span
                              onClick={(e) => { e.stopPropagation(); openLightbox(lightboxImages, products?.findIndex((pr) => pr.id === p.id) ?? 0); }}
                              className="absolute right-1 top-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-md bg-background/80 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-primary hover:text-primary-foreground"
                              title={t("zoomIn")}
                            >
                              <ZoomIn className="h-3.5 w-3.5" />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 图库（相册式，点击放大） */}
      {isLoading ? (
        <div className="flex justify-center py-20 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
      ) : !products?.length ? (
        <div className="dark-card flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <ImagePlus className="h-10 w-10" />
          <p className="font-medium">{t("emptyGallery")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {products.map((p, idx) => (
            <figure
              key={p.id}
              className="gallery-card group relative overflow-hidden rounded-xl border-2 border-border bg-card shadow-[0_8px_30px_rgb(0,0,0,0.4)] transition-all hover:border-primary hover:shadow-[0_0_24px_hsl(187_92%_45%/0.25)]"
            >
              <ZoomableImage
                src={p.imageData}
                title={p.name}
                images={lightboxImages}
                index={idx}
                className="aspect-square w-full"
                imgClassName="gallery-img h-full w-full object-cover"
              />
              <figcaption className="absolute inset-x-0 bottom-0 border-t-2 border-border bg-background/85 px-3 py-2 backdrop-blur-sm">
                <p className="truncate text-sm font-bold text-foreground">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t("idNo")}
                  {p.id}
                </p>
              </figcaption>
              <button
                onClick={() => deleteMut.mutate({ id: p.id })}
                className="absolute right-2 top-2 rounded-lg border-2 border-destructive/60 bg-background/80 p-1.5 text-destructive opacity-0 backdrop-blur-sm transition-opacity hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
                title={t("delete")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
