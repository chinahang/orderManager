import { Routes, Route, Link, useLocation, Navigate } from "react-router";
import { Images, FilePlus2, ClipboardList, PackageOpen, RefreshCcw, Languages, BarChart3 } from "lucide-react";
import ProductsPage from "./pages/Products";
import NewOrderPage from "./pages/NewOrder";
import ProcessPage from "./pages/Process";
import StatsPage from "./pages/Stats";
import RoleSelectPage from "./pages/RoleSelect";
import { useRole, type Role } from "@/hooks/useRole";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

export default function App() {
  const location = useLocation();
  const { role, setRole, clearRole } = useRole();
  const { lang, setLang, t } = useI18n();

  const langBtn = (
    <button
      onClick={() => setLang(lang === "en" ? "zh" : "en")}
      className="flex items-center gap-1.5 rounded-lg border-2 border-border bg-secondary px-3 py-1.5 text-sm font-bold text-foreground transition-all hover:border-primary hover:text-primary"
      title={lang === "en" ? "切换到中文" : "Switch to English"}
    >
      <Languages className="h-4 w-4" />
      {lang === "en" ? "中文" : "EN"}
    </button>
  );

  if (!role)
    return (
      <div className="relative">
        <div className="absolute right-3 top-3 z-10 md:right-5 md:top-5">{langBtn}</div>
        <RoleSelectPage onSelect={setRole} />
      </div>
    );

  const allNav = [
    { path: "/", label: t("gallery"), icon: Images, roles: ["仓库"] as Role[] },
    { path: "/new-order", label: t("submitOrder"), icon: FilePlus2, roles: ["大店", "小店"] as Role[] },
    { path: "/process", label: t("processOrders"), icon: ClipboardList, roles: ["仓库"] as Role[] },
    { path: "/stats", label: t("stats"), icon: BarChart3, roles: ["仓库"] as Role[] },
  ];
  const nav = allNav.filter((n) => n.roles.includes(role));
  const defaultPath = role === "仓库" ? "/process" : "/new-order";

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-10 border-b-2 border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-3 md:h-16 md:px-4">
          <span className="flex items-center gap-2 text-base font-extrabold tracking-wide text-foreground md:text-lg">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-primary bg-primary/15 text-primary md:h-9 md:w-9">
              <PackageOpen className="h-4 w-4 md:h-5 md:w-5" />
            </span>
            {t("appName")}
          </span>
          <div className="flex items-center gap-2">
            <nav className="hidden gap-2 md:flex">
              {nav.map((n) => {
                const active = location.pathname === n.path;
                return (
                  <Link
                    key={n.path}
                    to={n.path}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border-2 px-3.5 py-1.5 text-sm font-bold transition-all",
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-[0_0_16px_hsl(187_92%_45%/0.35)]"
                        : "border-transparent text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <n.icon className="h-4 w-4" />
                    {n.label}
                  </Link>
                );
              })}
            </nav>
            {langBtn}
            <button
              onClick={clearRole}
              className="flex items-center gap-1.5 rounded-lg border-2 border-border bg-secondary px-3 py-1.5 text-sm font-bold text-foreground transition-all hover:border-primary hover:text-primary"
              title={t("switchRole")}
            >
              <RefreshCcw className="h-4 w-4" />
              <span className="hidden sm:inline">
                {role === "大店" ? t("bigShop") : role === "小店" ? t("smallShop") : t("warehouse")}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-4 md:px-4 md:py-8">
        <Routes key={role}>
          <Route path="/" element={role === "仓库" ? <ProductsPage /> : <Navigate to={defaultPath} replace />} />
          <Route
            path="/new-order"
            element={role === "仓库" ? <Navigate to="/process" replace /> : <NewOrderPage role={role} />}
          />
          <Route path="/process" element={role === "仓库" ? <ProcessPage /> : <Navigate to={defaultPath} replace />} />
          <Route path="/stats" element={role === "仓库" ? <StatsPage /> : <Navigate to={defaultPath} replace />} />
          <Route path="*" element={<Navigate to={defaultPath} replace />} />
        </Routes>
      </main>

      {/* 移动端底部导航栏 */}
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t-2 border-border bg-background/90 backdrop-blur-md md:hidden">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0,1fr))` }}>
          {nav.map((n) => {
            const active = location.pathname === n.path;
            return (
              <Link
                key={n.path}
                to={n.path}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-xs font-bold transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <n.icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_6px_hsl(187_92%_45%/0.6)]")} />
                {n.label}
                <span
                  className={cn(
                    "h-0.5 w-8 rounded-full transition-all",
                    active ? "bg-primary shadow-[0_0_8px_hsl(187_92%_45%/0.8)]" : "bg-transparent"
                  )}
                />
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
