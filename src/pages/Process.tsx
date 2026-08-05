import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Archive, ChevronDown, ClipboardList, Loader2, Trash2, Check, Undo2 } from "lucide-react";
import { ZoomableImage, type LightboxImage } from "@/components/ImageLib";
import { useI18n } from "@/i18n";

type OrderItem = {
  id: number;
  orderId: number;
  productId: number | null;
  name: string;
  productName: string | null;
  quantity: number;
  actualQuantity: number | null;
  size: string | null;
  remark: string | null;
  itemDate: string | null;
  shop: string | null;
  done: boolean;
  imagePath: string | null;
};

type Order = {
  id: number;
  orderNo: string;
  remark: string | null;
  confirmed: boolean;
  createdAt: Date;
  items: OrderItem[];
};

function ItemCard({ item, images, index, readOnly }: { item: OrderItem; images: LightboxImage[]; index: number; readOnly?: boolean }) {
  const utils = trpc.useUtils();
  const { t } = useI18n();
  const [actual, setActual] = useState<string>(
    item.actualQuantity !== null ? String(item.actualQuantity) : ""
  );

  const invalidate = () => utils.orders.list.invalidate();

  const doneMut = trpc.orders.setItemDone.useMutation({
    onMutate: async ({ itemId, done, actualQuantity }) => {
      await utils.orders.list.cancel();
      const prev = utils.orders.list.getData();
      utils.orders.list.setData(undefined, (old) =>
        old?.map((o) => ({
          ...o,
          items: o.items.map((i) =>
            i.id === itemId
              ? { ...i, done, ...(actualQuantity !== undefined ? { actualQuantity } : {}) }
              : i
          ),
        }))
      );
      return { prev };
    },
    onError: (e, _v, ctx) => {
      utils.orders.list.setData(undefined, ctx?.prev);
      toast.error(t("saveFailed") + e.message);
    },
    onSettled: invalidate,
  });

  const actualMut = trpc.orders.setItemActualQuantity.useMutation({
    onError: (e) => toast.error(t("actualSaveFailed") + e.message),
    onSettled: invalidate,
  });

  function onToggle(done: boolean) {
    const aq = actual.trim() === "" ? undefined : Math.max(0, parseInt(actual, 10) || 0);
    doneMut.mutate({ itemId: item.id, done, actualQuantity: aq });
  }

  function onActualBlur() {
    const v = actual.trim() === "" ? null : Math.max(0, parseInt(actual, 10) || 0);
    if (v === item.actualQuantity || v === null) return;
    actualMut.mutate({ itemId: item.id, actualQuantity: v });
  }

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border-2 transition-all ${
        item.done
          ? "border-primary/50 bg-primary/10"
          : "border-border bg-secondary/30 hover:border-muted-foreground/50"
      }`}
    >
      {/* 图片区（点击放大） */}
      <div className="relative aspect-square bg-background">
        <ZoomableImage
          src={item.imagePath ? `/images/${item.imagePath}` : null}
          title={item.productName ?? item.name}
          images={images}
          index={index}
          className="h-full w-full"
        />
        {!item.imagePath && (
          <div className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-xs text-muted-foreground">
            {t("noImage")}
          </div>
        )}
        {item.done && (
          <span className="absolute left-2 top-2 rounded-md border-2 border-primary bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">
            {t("processed")}
          </span>
        )}
      </div>

      {/* 信息区 */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span
              className={`block text-sm font-bold leading-tight ${
                item.done ? "text-muted-foreground line-through" : "text-foreground"
              }`}
            >
              {item.name}
            </span>
            {item.productName && item.productName !== item.name && (
              <span className="block truncate text-xs text-muted-foreground">{item.productName}</span>
            )}
          </div>
          <Checkbox
            checked={item.done}
            onCheckedChange={(v) => !readOnly && onToggle(v === true)}
            disabled={readOnly}
            className="mt-0.5 h-6 w-6 shrink-0 border-2 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
          />
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <span className="text-muted-foreground">
            {t("declared")} <span className="font-bold text-foreground">×{item.quantity}</span>
          </span>
          <span className="text-muted-foreground">
            {t("size")} <span className="text-foreground">{item.size || "-"}</span>
          </span>
          <span className="text-muted-foreground">
            {t("shop")} <span className="text-foreground">{item.shop || "-"}</span>
          </span>
          <span className="text-muted-foreground">
            {t("date")} <span className="text-foreground">{item.itemDate || "-"}</span>
          </span>
          {item.remark && (
            <span className="col-span-2 break-all text-muted-foreground">
              {t("remark")} <span className="text-foreground">{item.remark}</span>
            </span>
          )}
        </div>
        {/* 实际数量 */}
        <div className="mt-auto flex items-center gap-2 border-t border-border/60 pt-2">
          <label className="shrink-0 text-xs font-bold text-muted-foreground">{t("actualQty")}</label>
          <Input
            type="number"
            min={0}
            value={actual}
            placeholder={String(item.quantity)}
            onChange={(e) => setActual(e.target.value)}
            onBlur={onActualBlur}
            disabled={readOnly}
            className={`h-8 border-2 bg-background text-sm font-bold ${
              item.actualQuantity !== null && item.actualQuantity !== item.quantity
                ? "border-amber-500/70 text-amber-400"
                : ""
            }`}
          />
          {item.actualQuantity !== null && item.actualQuantity !== item.quantity && (
            <span className="shrink-0 text-xs font-bold text-amber-400">{t("diff")}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const utils = trpc.useUtils();
  const { t } = useI18n();
  const deleteMut = trpc.orders.delete.useMutation({
    onSuccess: () => {
      utils.orders.list.invalidate();
      toast.success(t("orderDeleted"));
    },
  });

  const confirmMut = trpc.orders.setConfirmed.useMutation({
    onSuccess: () => utils.orders.list.invalidate(),
    onError: (e) => toast.error(t("confirmFailed") + e.message),
  });

  const doneCount = order.items.filter((i) => i.done).length;
  const allDone = order.items.length > 0 && doneCount === order.items.length;
  // 灯箱整组图片（本提单所有有图明细）
  const images: LightboxImage[] = order.items
    .filter((i) => i.imagePath)
    .map((i) => ({ src: `/images/${i.imagePath!}`, title: i.productName ?? i.name }));

  return (
    <section
      className={`dark-card overflow-hidden transition-all ${
        allDone ? "border-primary/60 shadow-[0_0_24px_hsl(187_92%_45%/0.15)]" : ""
      }`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-border bg-secondary/30 px-4 py-3 md:px-5">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <span className="text-sm font-extrabold text-foreground md:text-base">
            {t("orderNo")}
            {order.orderNo}
          </span>
          <Badge
            className={`border-2 font-bold ${
              allDone
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-secondary text-secondary-foreground"
            }`}
          >
            {allDone ? t("completed") : `${t("processing")} ${doneCount}/${order.items.length}`}
          </Badge>
          {order.confirmed && (
            <Badge className="border-2 border-primary/50 bg-primary/10 font-bold text-primary">
              {t("confirmed")}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {new Date(order.createdAt).toLocaleString()}
          </span>
          {order.remark && (
            <span className="text-xs text-muted-foreground">
              {t("remarkPrefix")}
              {order.remark}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {order.confirmed ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => confirmMut.mutate({ id: order.id, confirmed: false })}
              className="border-2 font-bold"
            >
              <Undo2 className="mr-1 h-4 w-4" /> {t("undo")}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                if (!allDone) return toast.error(t("notAllDone"));
                confirmMut.mutate({ id: order.id, confirmed: true });
              }}
              disabled={!allDone || confirmMut.isPending}
              className="border-2 border-primary font-bold shadow-[0_0_12px_hsl(187_92%_45%/0.3)]"
            >
              <Check className="mr-1 h-4 w-4" /> {t("confirm")}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteMut.mutate({ id: order.id })}
            title={t("deleteOrder")}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 md:p-4 lg:grid-cols-3 xl:grid-cols-4">
        {order.items.map((it, idx) => (
          <ItemCard key={it.id} item={it} images={images} index={Math.max(0, order.items.slice(0, idx).filter((i) => i.imagePath).length)} readOnly={order.confirmed} />
        ))}
      </div>
    </section>
  );
}

export default function ProcessPage() {
  const { data: orders, isLoading } = trpc.orders.list.useQuery();
  const { t } = useI18n();
  const [archiveOpen, setArchiveOpen] = useState(false);

  if (isLoading)
    return (
      <div className="flex justify-center py-20 text-muted-foreground">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
    );
  if (!orders?.length)
    return (
      <div className="dark-card flex flex-col items-center gap-3 py-20 text-muted-foreground">
        <ClipboardList className="h-10 w-10" />
        <p className="font-medium">{t("waitingOrders")}</p>
      </div>
    );

  const active = orders.filter(
    (o) => !(o.confirmed && o.items.length > 0 && o.items.every((i) => i.done))
  ) as Order[];
  const archived = orders.filter(
    (o) => o.confirmed && o.items.length > 0 && o.items.every((i) => i.done)
  ) as Order[];

  return (
    <div className="space-y-6">
      {active.length === 0 && (
        <div className="dark-card flex flex-col items-center gap-3 py-14 text-muted-foreground">
          <ClipboardList className="h-9 w-9" />
          <p className="font-medium">{t("noPending")}</p>
        </div>
      )}
      {active.map((o) => (
        <OrderCard key={o.id} order={o} />
      ))}

      {archived.length > 0 && (
        <section className="dark-card overflow-hidden">
          <button
            onClick={() => setArchiveOpen((v) => !v)}
            className="flex w-full items-center justify-between border-b-2 border-border bg-secondary/30 px-4 py-3.5 md:px-5"
          >
            <span className="flex items-center gap-2 text-sm font-extrabold text-foreground md:text-base">
              <Archive className="h-5 w-5 text-primary" />
              {t("archived")}
              <Badge className="border-2 border-border bg-secondary font-bold text-secondary-foreground">
                {archived.length} {t("archivedCount")}
              </Badge>
            </span>
            <ChevronDown
              className={`h-5 w-5 text-muted-foreground transition-transform ${
                archiveOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {archiveOpen && (
            <div className="space-y-6 p-3 md:p-4">
              {archived.map((o) => (
                <OrderCard key={o.id} order={o} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
