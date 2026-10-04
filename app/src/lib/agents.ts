/**
 * Agent vocabulary the UI needs to name.
 *
 * The preview had these as mock data, but they are configuration the app owns, not
 * records the backend sends — so they live here next to the code that renders them.
 */

export const THOUGHT_LEVELS = ["off", "low", "medium", "high", "ultra"] as const;

export type ThoughtLevel = (typeof THOUGHT_LEVELS)[number];

export type ProviderId = "openai" | "deepseek" | "dashscope" | "ollama" | "custom";

/** Which SDK model class each provider maps to. Mirrors `sidecar/src/model.ts`. */
export const PROVIDER_LABELS: Record<ProviderId, string> = {
  openai: "OpenAI",
  deepseek: "DeepSeek",
  dashscope: "DashScope",
  ollama: "Ollama",
  custom: "Custom",
};

export const PROVIDER_IDS = Object.keys(PROVIDER_LABELS) as ProviderId[];

export function providerLabel(id: string): string {
  return PROVIDER_LABELS[id as ProviderId] ?? id;
}