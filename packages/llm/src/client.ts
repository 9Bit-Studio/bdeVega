import { resolveModel } from "./models.js";
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
          data: JSON.parse(fixture.raw) as T,
          model: fixture.model,
          provider: fixture.provider,
          raw: fixture.raw,
          replayed: true,
        };
      }

      const raw = await transport({ ...request, model });
      const response: LLMResponse<T> = {
        data: JSON.parse(raw) as T,
        model,
        provider: request.provider,
        raw,
        replayed: false,
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
