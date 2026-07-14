import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

import type { ProviderTransport } from "./types.js";

export const providerTransport: ProviderTransport = async (request) => {
  if (request.provider === "openai") {
    const client = new OpenAI({ apiKey: request.apiKey });
    const response = await client.responses.create({
      model: request.model,
      instructions: request.system,
      input: request.messages.map((message) => ({ role: message.role, content: message.content })),
      text: {
        format: {
          type: "json_schema",
          name: "vega_response",
          schema: request.jsonSchema,
          strict: true,
        },
      },
    });
    return {
      raw: response.output_text,
      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
      },
    };
  }

  if (request.provider === "anthropic") {
    const client = new Anthropic({ apiKey: request.apiKey });
    const response = await client.messages.create({
      model: request.model,
      max_tokens: 8_192,
      system: request.system,
      messages: request.messages,
      tools: [{ name: "emit_json", description: "Return the requested JSON", input_schema: request.jsonSchema as Anthropic.Tool.InputSchema }],
      tool_choice: { type: "tool", name: "emit_json" },
    });
    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") throw new Error("Anthropic returned no structured tool result");
    return {
      raw: JSON.stringify(toolUse.input),
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  const client = new GoogleGenAI({ apiKey: request.apiKey });
  const response = await client.models.generateContent({
    model: request.model,
    contents: request.messages.map((message) => `${message.role}: ${message.content}`).join("\n\n"),
    config: {
      systemInstruction: request.system,
      responseMimeType: "application/json",
      responseJsonSchema: request.jsonSchema,
    },
  });
  if (!response.text) throw new Error("Gemini returned an empty structured response");
  return {
    raw: response.text,
    usage: {
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
    },
  };
};
