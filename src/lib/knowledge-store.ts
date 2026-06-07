import { useEffect, useState } from "react";

export type Knowledge = {
  id: string;
  area: string;
  expert: string;
  text: string;
  source: string;
  confidence: string;
  createdAt: number;
};

const KEY = "db_knowledge_v1";
const EVT = "db:knowledge-changed";

function read(): Knowledge[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Knowledge[]) : [];
  } catch {
    return [];
  }
}

function write(next: Knowledge[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function addKnowledge(entry: Omit<Knowledge, "id" | "createdAt">) {
  const full: Knowledge = {
    ...entry,
    id: Math.random().toString(36).slice(2, 10),
    createdAt: Date.now(),
  };
  write([full, ...read()]);
  return full;
}

export function useKnowledge(): Knowledge[] {
  const [items, setItems] = useState<Knowledge[]>([]);
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
