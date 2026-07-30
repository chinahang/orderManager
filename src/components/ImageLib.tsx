import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight, ImageOff, X, ZoomIn, Check } from "lucide-react";
import { useI18n } from "@/i18n";

/* ================= 图片工具函数 ================= */

/** 压缩图片为 base64 data URL（上传前处理） */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 800;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = reject;
    img.src = url;
  });
}

/* ================= 灯箱（放大查看，支持左右切换） ================= */

export interface LightboxImage {
  src: string;
  title?: string;
}

interface LightboxCtxType {
  open: (images: LightboxImage[], index: number) => void;
}

const LightboxCtx = createContext<LightboxCtxType>({ open: () => {} });

export function useLightbox() {
  return useContext(LightboxCtx);
}

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ images: LightboxImage[]; index: number } | null>(null);

  const open = useCallback((images: LightboxImage[], index: number) => {
    setState({ images, index });
  }, []);

  const close = useCallback(() => setState(null), []);
  const prev = useCallback(
    () => setState((s) => (s ? { ...s, index: (s.index - 1 + s.images.length) % s.images.length } : s)),
    []
  );
  const next = useCallback(
    () => setState((s) => (s ? { ...s, index: (s.index + 1) % s.images.length } : s)),
    []
  );

  // 键盘操作：Esc 关闭，←→ 切换
  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, close, prev, next]);

  const current = state?.images[state.index];

  return (
    <LightboxCtx.Provider value={{ open }}>
      {children}
      {state && current && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <button
            className="absolute right-4 top-4 rounded-full border-2 border-border bg-background/70 p-2 text-foreground transition-colors hover:border-primary hover:text-primary"
            onClick={close}
          >
            <X className="h-6 w-6" />
          </button>
          {state.images.length > 1 && (
            <>
              <button
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border-2 border-border bg-background/70 p-2.5 text-foreground transition-colors hover:border-primary hover:text-primary md:left-6"
                onClick={(e) => { e.stopPropagation(); prev(); }}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border-2 border-border bg-background/70 p-2.5 text-foreground transition-colors hover:border-primary hover:text-primary md:right-6"
                onClick={(e) => { e.stopPropagation(); next(); }}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          <img
            src={current.src}
            alt={current.title ?? ""}
            className="max-h-[80vh] max-w-full rounded-xl border-2 border-border object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="mt-3 flex items-center gap-3 text-sm font-bold text-foreground">
            {current.title && <span>{current.title}</span>}
            {state.images.length > 1 && (
              <span className="text-muted-foreground">
                {state.index + 1} / {state.images.length}
              </span>
            )}
          </div>
        </div>
      )}
    </LightboxCtx.Provider>
  );
}

/* ================= 可放大的图片缩略图 ================= */

/** 单张图片：悬浮显示放大镜，点击进入灯箱 */
export function ZoomableImage({
  src,
  title,
  images,
  index = 0,
  className = "",
  imgClassName = "h-full w-full object-cover",
}: {
  src: string | null;
  title?: string;
  /** 灯箱中的整组图片（默认仅当前一张） */
  images?: LightboxImage[];
  index?: number;
  className?: string;
  imgClassName?: string;
}) {
  const { open } = useLightbox();
  if (!src) {
    return (
      <div className={`flex flex-col items-center justify-center gap-1 text-muted-foreground ${className}`}>
        <ImageOff className="h-8 w-8" />
      </div>
    );
  }
  const group = images ?? [{ src, title }];
  return (
    <button
      type="button"
      className={`group/zoom relative block overflow-hidden ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        open(group, index);
      }}
    >
      <img src={src} alt={title ?? ""} className={imgClassName} loading="lazy" />
      <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover/zoom:bg-black/40 group-hover/zoom:opacity-100">
        <ZoomIn className="h-8 w-8 text-white drop-shadow" />
      </span>
    </button>
  );
}

/* ================= 选品轮播（全屏单图，支持选择模式） ================= */

export interface CarouselImage {
  id: number;
  src: string;
  title: string;
}

interface SelectionCarouselProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupName: string;
  images: CarouselImage[];
  /** productId → 当前订单中已添加次数 */
  currentCounts: Map<number, number>;
  /** 单张添加（默认模式点击"添加"时调用） */
  onAdd: (imageIndex: number) => void;
}

export function SelectionCarousel({
  open,
  onOpenChange,
  groupName,
  images,
  currentCounts,
  onAdd,
}: SelectionCarouselProps) {
  const [index, setIndex] = useState(0);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const { t } = useI18n();

  const current = images[index];
  const currentCount = current ? (currentCounts.get(current.id) ?? 0) : 0;

  const close = useCallback(() => {
    setSelectMode(false);
    setSelected(new Set());
    setIndex(0);
    onOpenChange(false);
  }, [onOpenChange]);

  const goPrev = useCallback(
    () => setIndex((i) => (i - 1 + images.length) % images.length),
    [images.length]
  );
  const goNext = useCallback(
    () => setIndex((i) => (i + 1) % images.length),
    [images.length]
  );

  const toggleSelect = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBatchAdd = useCallback(() => {
    const picked = [...selected];
    if (picked.length > 0) {
      picked.forEach((id) => {
        const idx = images.findIndex((img) => img.id === id);
        if (idx >= 0 && (currentCounts.get(images[idx].id) ?? 0) === 0) onAdd(idx);
      });
    }
    close();
  }, [selected, images, currentCounts, onAdd, close]);

  // 键盘操作
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, goPrev, goNext]);

  // 触摸滑动
  const touchStartX = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx > 60) goPrev();
    if (dx < -60) goNext();
  };

  if (!open || !current) return null;

  const isSelectChecked = selected.has(current.id);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      {/* 顶部栏 */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-extrabold text-foreground">
          {selectMode ? `${selected.size} ${t("selectedCount")}` : groupName}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setSelectMode((s) => !s); setSelected(new Set()); }}
            className="rounded-lg border-2 border-border px-3 py-1 text-xs font-bold text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            {selectMode ? t("cancelSelect") : t("selectMode")}
          </button>
          <button
            onClick={close}
            className="rounded-lg border-2 border-border p-1.5 text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* 图片区域 */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden px-12"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={(e) => { if (selectMode && currentCount === 0) { e.stopPropagation(); toggleSelect(current.id); } }}
      >
        {/* 左右箭头 */}
        {images.length > 1 && (
          <>
            <button
              className="absolute left-2 z-10 rounded-full border-2 border-border bg-background/70 p-2.5 text-foreground transition-colors hover:border-primary hover:text-primary md:left-4"
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              className="absolute right-2 z-10 rounded-full border-2 border-border bg-background/70 p-2.5 text-foreground transition-colors hover:border-primary hover:text-primary md:right-4"
              onClick={(e) => { e.stopPropagation(); goNext(); }}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        {/* 计数 badge（已添加次数） */}
        {currentCount > 0 && (
          <span className="absolute right-3 top-3 z-10 flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-primary bg-primary px-1.5 text-sm font-extrabold text-primary-foreground">
            {currentCount}
          </span>
        )}

        {/* 选择模式勾选圈 */}
        {selectMode && (
          currentCount > 0 ? (
            <span className="absolute left-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-muted-foreground bg-background/70 text-xs font-bold text-muted-foreground backdrop-blur-sm">
              {t("imgAdded")}
            </span>
          ) : (
            <span
              className={`absolute left-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-sm font-bold transition-all ${
                isSelectChecked
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground bg-background/70 text-transparent backdrop-blur-sm"
              }`}
            >
              <Check className="h-4 w-4" />
            </span>
          )
        )}

        {/* 图片 */}
        <img
          src={current.src}
          alt={current.title}
          className="max-h-[70vh] max-w-full rounded-xl border-2 border-border object-contain"
        />
      </div>

      {/* 底部栏 */}
      <div className="px-4 py-4">
        {/* 进度 + 标题 */}
        <div className="mb-3 flex items-center justify-center gap-3 text-sm font-bold text-foreground">
          {current.title && <span>{current.title}</span>}
          {images.length > 1 && (
            <span className="text-muted-foreground">{index + 1} / {images.length}</span>
          )}
        </div>

        {/* 按钮 */}
        {selectMode ? (
          <button
            disabled={selected.size === 0}
            onClick={handleBatchAdd}
            className="w-full rounded-xl border-2 border-primary bg-primary py-3 text-base font-extrabold text-primary-foreground shadow-[0_0_16px_hsl(187_92%_45%/0.3)] transition-opacity disabled:opacity-40"
          >
            {t("addSelected")} ({selected.size})
          </button>
        ) : (
          <button
            disabled={currentCount > 0}
            onClick={() => { onAdd(index); }}
            className="w-full rounded-xl border-2 border-primary bg-primary py-3 text-base font-extrabold text-primary-foreground shadow-[0_0_16px_hsl(187_92%_45%/0.3)] transition-opacity disabled:opacity-40 disabled:border-muted disabled:bg-secondary disabled:text-muted-foreground disabled:shadow-none"
          >
            {currentCount > 0 ? t("imgAdded") : t("addImg")}
          </button>
        )}
      </div>
    </div>
  );
}
