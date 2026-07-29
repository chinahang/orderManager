import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight, ImageOff, X, ZoomIn } from "lucide-react";

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
