import { useEffect, useState } from "react";

export type PmVerdict = "approved" | "rejected";

export type PmDecision = {
  id: string;
  verdict: PmVerdict;
  topic: string;
  question: string;
  score: number;
  recommendation: string;
  comment: string;
  expertsConsulted: string[];
  projectId?: string;
  projectName?: string;
  createdAt: number;
  seenBy: string[];
};

const KEY = "db_pm_decisions_v1";
const EVT = "db:pm-decisions-changed";

function read(): PmDecision[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PmDecision[]) : [];
  } catch {
    return [];
  }
}

function write(next: PmDecision[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function addPmDecision(entry: Omit<PmDecision, "id" | "createdAt" | "seenBy">) {
  const full: PmDecision = {
    ...entry,
    id: Math.random().toString(36).slice(2, 10),
    createdAt: Date.now(),
    seenBy: [],
  };
  write([full, ...read()]);
  return full;
}

export function markDecisionSeen(decisionId: string, expertName: string) {
  const all = read();
  write(
    all.map((d) =>
      d.id === decisionId && !d.seenBy.includes(expertName)
        ? { ...d, seenBy: [...d.seenBy, expertName] }
        : d,
    ),
  );
}

export function usePmDecisions(): PmDecision[] {
  const [items, setItems] = useState<PmDecision[]>([]);
  useEffect(() => {
    setItems(read());
    const onChange = () => setItems(read());
    window.addEventListener(EVT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return items;
}
