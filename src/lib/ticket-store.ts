import { useEffect, useState } from "react";

export type Ticket = {
  id: string;
  title: string;
  assignedTo: string;
  question: string;
  area: string;
  sourceQuestion: string;
  status: "open" | "answered";
  createdAt: number;
  answeredAt?: number;
  answer?: string;
};

const KEY = "db_tickets_v1";
const EVT = "db:tickets-changed";

function read(): Ticket[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Ticket[]) : [];
  } catch {
    return [];
  }
}

function write(next: Ticket[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function addTicket(entry: Omit<Ticket, "id" | "createdAt" | "status">) {
  const full: Ticket = {
    ...entry,
    id: Math.random().toString(36).slice(2, 10),
    status: "open",
    createdAt: Date.now(),
  };
  write([full, ...read()]);
  return full;
}

export function answerTicket(id: string, answer: string) {
  const all = read();
  const next = all.map((t) =>
    t.id === id ? { ...t, status: "answered" as const, answer, answeredAt: Date.now() } : t,
  );
  write(next);
}

export function useTickets(): Ticket[] {
  const [items, setItems] = useState<Ticket[]>([]);
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
