export type ConnectionId = "gmail" | "jira" | "slack" | "teams" | "zoom" | "gmeet";

export type ConnectionConfig =
  | { id: "gmail"; status: "connected"; mcpEndpoint: string; token: string }
  | { id: Exclude<ConnectionId, "gmail">; status: "connected"; mcpEndpoint: string }
  | { id: ConnectionId; status: "disconnected" };

export type LlmProvider = "gemini" | "internal" | "azure" | "bedrock";

export type LlmConfig =
  | { provider: "gemini" }
  | { provider: "internal"; endpoint: string }
  | { provider: "azure"; endpoint: string; apiKey: string }
  | { provider: "bedrock"; region: string; modelId: string };

const CONN_KEY = "db_connections_v1";
const LLM_KEY = "db_llm_config_v1";

function loadConns(): Partial<Record<ConnectionId, ConnectionConfig>> {
  try { return JSON.parse(localStorage.getItem(CONN_KEY) ?? "{}"); } catch { return {}; }
}

function saveConns(data: Partial<Record<ConnectionId, ConnectionConfig>>) {
  localStorage.setItem(CONN_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent("db:connections-changed"));
}

export function getConnection(id: ConnectionId): ConnectionConfig {
  return loadConns()[id] ?? { id, status: "disconnected" };
}

export function setConnection(config: ConnectionConfig) {
  const data = loadConns();
  data[config.id] = config;
  saveConns(data);
}

export function removeConnection(id: ConnectionId) {
  const data = loadConns();
  data[id] = { id, status: "disconnected" };
  saveConns(data);
}

export function useConnections(): Partial<Record<ConnectionId, ConnectionConfig>> {
  const [state, setState] = useState(loadConns());
  useEffect(() => {
    const handler = () => setState(loadConns());
    window.addEventListener("db:connections-changed", handler);
    return () => window.removeEventListener("db:connections-changed", handler);
  }, []);
  return state;
}

function loadLlm(): LlmConfig {
  try {
    const raw = localStorage.getItem(LLM_KEY);
    if (raw) return JSON.parse(raw) as LlmConfig;
  } catch { /* */ }
  return { provider: "gemini" };
}

function saveLlm(config: LlmConfig) {
  localStorage.setItem(LLM_KEY, JSON.stringify(config));
  window.dispatchEvent(new CustomEvent("db:llm-changed"));
}

export function getLlmConfig(): LlmConfig { return loadLlm(); }

export function setLlmConfig(config: LlmConfig) { saveLlm(config); }

export function useLlmConfig(): [LlmConfig, (c: LlmConfig) => void] {
  const [state, setState] = useState(loadLlm());
  useEffect(() => {
    const handler = () => setState(loadLlm());
    window.addEventListener("db:llm-changed", handler);
    return () => window.removeEventListener("db:llm-changed", handler);
  }, []);
  return [state, setLlmConfig];
}

// Needed for the hooks
import { useState, useEffect } from "react";
