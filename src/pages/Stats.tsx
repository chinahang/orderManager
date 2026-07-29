import { trpc } from "@/providers/trpc";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n";

interface StatRow {
  shop: string;
  name: string;
  qty: number;
}

interface DateGroup {
  date: string;
  rows: StatRow[];
  shopSubtotals: Record<string, number>;
  dailyTotal: number;
}

export default function StatsPage() {
  const { data: orders, isLoading } = trpc.orders.list.useQuery();
  const { t } = useI18n();

  if (isLoading)
    return (
      <div className="flex justify-center py-20 text-muted-foreground">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
    );

  const confirmed = (orders ?? []).filter(
    (o) => o.confirmed && o.items.length > 0
  );

  if (confirmed.length === 0)
    return (
      <div className="dark-card flex flex-col items-center gap-3 py-20 text-muted-foreground">
        <BarChart3 className="h-10 w-10" />
        <p className="font-medium">{t("noStatsData")}</p>
      </div>
    );

  // 展平已确认订单的所有明细，按 [日期, 店铺, 品名] 聚合实际数量
  const agg = new Map<string, Map<string, Map<string, number>>>();

  for (const o of confirmed) {
    for (const it of o.items) {
      const date = it.itemDate || new Date(o.createdAt).toISOString().slice(0, 10);
      const shop = it.shop || "-";
      const qty = it.actualQuantity ?? it.quantity;
      if (!agg.has(date)) agg.set(date, new Map());
      const shopMap = agg.get(date)!;
      if (!shopMap.has(shop)) shopMap.set(shop, new Map());
      const nameMap = shopMap.get(shop)!;
      nameMap.set(it.name, (nameMap.get(it.name) ?? 0) + qty);
    }
  }

  // 按日期降序
  const dateGroups: DateGroup[] = [...agg.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, shopMap]) => {
      const rows: StatRow[] = [];
      const shopSubtotals: Record<string, number> = {};
      let dailyTotal = 0;
      for (const [shop, nameMap] of shopMap) {
        let shopTotal = 0;
        for (const [name, qty] of nameMap) {
          rows.push({ shop, name, qty });
          shopTotal += qty;
        }
        shopSubtotals[shop] = shopTotal;
        dailyTotal += shopTotal;
      }
      return { date, rows, shopSubtotals, dailyTotal };
    });

  return (
    <div className="space-y-6">
      <h2 className="flex items-center gap-2 text-base font-extrabold text-foreground">
        <BarChart3 className="h-5 w-5 text-primary" />
        {t("stats")}
      </h2>

      {dateGroups.map((g) => {
        // 按店铺分组，保留行顺序（已按店铺聚合）
        const shopOrder = [...new Set(g.rows.map((r) => r.shop))];

        return (
          <section key={g.date} className="dark-card overflow-hidden">
            <div className="flex items-center justify-between border-b-2 border-border bg-secondary/30 px-4 py-3">
              <span className="text-sm font-extrabold text-foreground">
                {g.date}
              </span>
              <Badge className="border-2 border-primary bg-primary font-bold text-primary-foreground">
                {g.dailyTotal}
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold text-muted-foreground">
                    <th className="px-4 py-2">{t("shopCol")}</th>
                    <th className="px-4 py-2">{t("itemNameCol")}</th>
                    <th className="px-4 py-2 text-right">{t("qtyCol")}</th>
                  </tr>
                </thead>
                <tbody>
                  {shopOrder.map((shop) => {
                    const shopRows = g.rows.filter((r) => r.shop === shop);
                    return (
                      <ShopSection
                        key={`${g.date}-${shop}`}
                        shop={shop}
                        rows={shopRows}
                        subtotal={g.shopSubtotals[shop]}
                        label={t("shopSubtotal")}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ShopSection({
  shop,
  rows,
  subtotal,
  label,
}: {
  shop: string;
  rows: StatRow[];
  subtotal: number;
  label: string;
}) {
  return (
    <>
      {rows.map((r, i) => (
        <tr
          key={`${r.shop}-${r.name}`}
          className="border-b border-border/40 hover:bg-secondary/20"
        >
          {i === 0 && (
            <td
              rowSpan={rows.length + 1}
              className="px-4 py-2 font-bold text-foreground align-top"
            >
              {shop}
            </td>
          )}
          <td className="px-4 py-2">{r.name}</td>
          <td className="px-4 py-2 text-right font-bold tabular-nums">
            {r.qty}
          </td>
        </tr>
      ))}
      <tr className="border-b-2 border-border bg-secondary/20 font-bold">
        <td className="px-4 py-2 text-muted-foreground">{label}</td>
        <td className="px-4 py-2 text-right text-primary tabular-nums">
          {subtotal}
        </td>
      </tr>
    </>
  );
}
