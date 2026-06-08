import { useEffect, useState } from "react";

export type Project = {
  id: string;
  name: string;
  businessUnit: string;
  pm: string;
  members: string[];
  areas: string[];
  createdAt: number;
};

const KEY = "db_projects_v1";
const EVT = "db:projects-changed";

function read(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Project[]) : [];
  } catch {
    return [];
  }
}

function write(next: Project[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function addProject(entry: Omit<Project, "id" | "createdAt">): Project {
  const full: Project = {
    ...entry,
    id: Math.random().toString(36).slice(2, 10),
    createdAt: Date.now(),
  };
  write([full, ...read()]);
  return full;
}

export function getProjects(): Project[] {
  return read();
}

export function useProjects(): Project[] {
  const [items, setItems] = useState<Project[]>([]);
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
