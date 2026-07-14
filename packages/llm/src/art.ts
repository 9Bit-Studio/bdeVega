import OpenAI from "openai";

export interface OpenAIArtRequest {
  apiKey: string;
  playerPrompt: string;
  environmentPrompt: string;
}

export interface GeneratedArtImage {
  bytes: Uint8Array;
  contentType: "image/png";
  prompt: string;
}

function decodeImage(data: string | undefined, prompt: string): GeneratedArtImage {
  if (!data) throw new Error("Image provider returned no image data");
  return { bytes: Buffer.from(data, "base64"), contentType: "image/png", prompt };
}

export async function generateOpenAIArtPack(request: OpenAIArtRequest): Promise<{
  player: GeneratedArtImage;
  environment: GeneratedArtImage;
}> {
  const client = new OpenAI({ apiKey: request.apiKey });
  const [player, environment] = await Promise.all([
    client.images.generate({
      model: "gpt-image-2",
      prompt: request.playerPrompt,
      size: "1024x1024",
      quality: "medium",
      output_format: "png",
    }),
    client.images.generate({
      model: "gpt-image-2",
      prompt: request.environmentPrompt,
      size: "1536x1024",
      quality: "medium",
      output_format: "png",
    }),
  ]);
  return {
    player: decodeImage(player.data?.[0]?.b64_json, request.playerPrompt),
    environment: decodeImage(environment.data?.[0]?.b64_json, request.environmentPrompt),
  };
}
