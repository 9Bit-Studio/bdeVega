import { estimateCostUsd, resolveModel } from "./models.js";
import { providerTransport } from "./providers.js";
import type {
  FixtureStore,
  GenerateRequest,
  LLMResponse,
  ProviderTransport,
} from "./types.js";

export interface LLMClientOptions {
  fixtureStore?: FixtureStore;
  transport?: ProviderTransport;
}

export function createLLMClient({ fixtureStore, transport = providerTransport }: LLMClientOptions = {}) {
  return {
    async generate<T = unknown>(request: GenerateRequest): Promise<LLMResponse<T>> {
      const model = request.model ?? resolveModel(request.provider, request.tier, request.devModelTier);
      const fixtureId = request.fixtureId;

      if (request.replay) {
        if (!fixtureId || !fixtureStore) throw new Error("LLM replay requires a fixtureId and fixture store");
        const fixture = await fixtureStore.read(fixtureId);
        if (!fixture) throw new Error(`Missing LLM replay fixture: ${fixtureId}`);
        return {
          costUsd: 0,
          data: JSON.parse(fixture.raw) as T,
          latencyMs: 0,
          model: fixture.model,
          provider: fixture.provider,
          raw: fixture.raw,
          replayed: true,
          usage: { inputTokens: 0, outputTokens: 0 },
        };
      }

      const startedAt = Date.now();
      const transportResult = await transport({ ...request, model });
      const latencyMs = Date.now() - startedAt;
      const raw = typeof transportResult === "string" ? transportResult : transportResult.raw;
      const usage = {
        inputTokens: typeof transportResult === "string" ? 0 : transportResult.usage?.inputTokens ?? 0,
        outputTokens: typeof transportResult === "string" ? 0 : transportResult.usage?.outputTokens ?? 0,
      };
      let data: T;
      try {
        data = JSON.parse(raw) as T;
      } catch {
        // Preserve malformed structured output so the caller can validate,
        // repair, and still account for the tokens spent on this attempt.
        data = raw as T;
      }
      const response: LLMResponse<T> = {
        costUsd: estimateCostUsd(model, usage.inputTokens, usage.outputTokens),
        data,
        latencyMs,
        model,
        provider: request.provider,
        raw,
        replayed: false,
        usage,
      };

      if (request.record) {
        if (!fixtureId || !fixtureStore) throw new Error("LLM recording requires a fixtureId and fixture store");
        await fixtureStore.write(fixtureId, { model, provider: request.provider, raw });
      }

      return response;
    },
  };
}

export type LLMClient = ReturnType<typeof createLLMClient>;
