export type LLMProvider = "openai" | "anthropic" | "gemini";
export type ModelTier = "fast" | "strong";

export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateRequest {
  apiKey: string;
  devModelTier?: boolean;
  fixtureId?: string;
  jsonSchema: Record<string, unknown>;
  messages: LLMMessage[];
  model?: string;
  provider: LLMProvider;
  record?: boolean;
  replay?: boolean;
  system: string;
  tier: ModelTier;
}

export interface LLMResponse<T = unknown> {
  costUsd: number;
  data: T;
  latencyMs: number;
  model: string;
  provider: LLMProvider;
  raw: string;
  replayed: boolean;
  usage: LLMUsage;
}

export interface LLMUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface ProviderTransportResult {
  raw: string;
  usage?: Partial<LLMUsage>;
}

export type ProviderTransport = (
  request: GenerateRequest & { model: string },
) => Promise<string | ProviderTransportResult>;

export interface FixtureRecord {
  model: string;
  provider: LLMProvider;
  raw: string;
}

export interface FixtureStore {
  read: (id: string) => Promise<FixtureRecord | undefined>;
  write: (id: string, fixture: FixtureRecord) => Promise<void>;
}
