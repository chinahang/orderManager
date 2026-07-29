import { useState, useCallback } from "react";

export type Role = "大店" | "小店" | "仓库";

const KEY = "tiding_role";

/** 角色 → 店铺字段存储值（随界面语言变化） */
export function roleShopName(role: Role, lang: "en" | "zh"): string {
  if (role === "大店") return lang === "en" ? "Big Shop" : "大店";
  if (role === "小店") return lang === "en" ? "Small Shop" : "小店";
  return lang === "en" ? "Warehouse" : "仓库";
}

export function getRole(): Role | null {
  const v = localStorage.getItem(KEY);
  return v === "大店" || v === "小店" || v === "仓库" ? v : null;
}

export function useRole() {
  const [role, setRoleState] = useState<Role | null>(getRole);

  const setRole = useCallback((r: Role) => {
    localStorage.setItem(KEY, r);
    setRoleState(r);
  }, []);

  const clearRole = useCallback(() => {
    localStorage.removeItem(KEY);
    setRoleState(null);
  }, []);

  return { role, setRole, clearRole };
}
