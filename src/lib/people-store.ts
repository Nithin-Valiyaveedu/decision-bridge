import { useState, useEffect } from "react";

export type ExpertProfile = {
  name: string;
  role: string;
  domain: string;
  email: string;       // default Infineon email
  demoEmail?: string;  // override used during demo
};

const KEY = "db_people_v1";
const EVT = "db:people-changed";

function load(): ExpertProfile[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ExpertProfile[]) : [];
  } catch { return []; }
}

function save(data: ExpertProfile[]) {
  localStorage.setItem(KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function setDemoEmail(name: string, demoEmail: string) {
  const data = load();
  const idx = data.findIndex((p) => p.name === name);
  if (idx >= 0) {
    data[idx] = { ...data[idx], demoEmail: demoEmail || undefined };
    save(data);
  }
}

export function resolveEmail(profiles: ExpertProfile[], name: string, defaultEmail: string): string {
  const p = profiles.find((x) => x.name === name);
  return p?.demoEmail || p?.email || defaultEmail;
}

export function initPeopleStore(defaults: ExpertProfile[]) {
  if (typeof window === "undefined") return;
  const existing = load();
  if (existing.length === 0) save(defaults);
}

export function usePeople(): ExpertProfile[] {
  const [state, setState] = useState<ExpertProfile[]>([]);
  useEffect(() => {
    setState(load());
    const handler = () => setState(load());
    window.addEventListener(EVT, handler);
    return () => window.removeEventListener(EVT, handler);
  }, []);
  return state;
}
