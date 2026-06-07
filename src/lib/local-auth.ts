export type AppRole = "admin" | "expert" | "pm";

const KEY = "db_demo_role";

const listeners = new Set<() => void>();

export function getRole(): AppRole | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(KEY);
  return v === "admin" || v === "expert" || v === "pm" ? v : null;
}

export function setRole(role: AppRole) {
  window.localStorage.setItem(KEY, role);
  listeners.forEach((l) => l());
}

export function clearRole() {
  window.localStorage.removeItem(KEY);
  listeners.forEach((l) => l());
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Demo credentials for the fake login form.
export const DEMO_ACCOUNTS: Record<string, { password: string; role: AppRole }> = {
  admin: { password: "admin", role: "admin" },
  expert: { password: "expert", role: "expert" },
  pm: { password: "pm", role: "pm" },
};
