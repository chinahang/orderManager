import { Store, Warehouse, PackageOpen } from "lucide-react";
import type { Role } from "@/hooks/useRole";
import { useI18n } from "@/i18n";

export default function RoleSelectPage({ onSelect }: { onSelect: (r: Role) => void }) {
  const { t } = useI18n();
  const roles = [
    { value: "大店" as Role, label: t("bigShop"), desc: t("bigShopDesc"), icon: Store },
    { value: "小店" as Role, label: t("smallShop"), desc: t("smallShopDesc"), icon: Store },
    { value: "仓库" as Role, label: t("warehouse"), desc: t("warehouseDesc"), icon: Warehouse },
  ];
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-10 flex flex-col items-center gap-3">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-primary bg-primary/15 text-primary shadow-[0_0_30px_hsl(187_92%_45%/0.3)]">
          <PackageOpen className="h-8 w-8" />
        </span>
        <h1 className="text-2xl font-extrabold tracking-wide text-foreground md:text-3xl">{t("appName")}</h1>
        <p className="text-sm text-muted-foreground">{t("selectRole")}</p>
      </div>
      <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
        {roles.map((r) => (
          <button
            key={r.value}
            onClick={() => onSelect(r.value)}
            className="group flex flex-col items-center gap-4 rounded-2xl border-2 border-border bg-card p-8 shadow-[0_8px_30px_rgb(0,0,0,0.4)] transition-all hover:-translate-y-1 hover:border-primary hover:shadow-[0_0_28px_hsl(187_92%_45%/0.3)]"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-border bg-secondary text-muted-foreground transition-colors group-hover:border-primary group-hover:bg-primary/15 group-hover:text-primary">
              <r.icon className="h-8 w-8" />
            </span>
            <span className="text-xl font-extrabold text-foreground">{r.label}</span>
            <span className="text-xs text-muted-foreground">{r.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
