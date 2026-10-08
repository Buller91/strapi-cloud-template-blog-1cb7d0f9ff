import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod/v4";
import { env } from "../env";

let client: Anthropic | null = null;
function anthropic() {
  // Schlüssel aus ANTHROPIC_API_KEY, nur serverseitig
  client ??= new Anthropic();
  return client;
}

export class AiError extends Error {}

/**
 * Ein strukturierter Aufruf: Antwort wird gegen das Zod-Schema geprüft.
 * Modell kommt aus ANTHROPIC_MODEL. Bei Ablehnung durch die Sicherheitsfilter
 * springt serverseitig ein Ersatzmodell ein (fallbacks: "default"),
 * abschaltbar mit ANTHROPIC_FALLBACKS=off.
 */
export async function structured<T extends z.ZodType>(opts: {
  system: string;
  prompt: string;
  schema: T;
  maxTokens?: number;
}): Promise<z.infer<T>> {
  const useFallbacks = process.env.ANTHROPIC_FALLBACKS !== "off";
  try {
    const response = await anthropic().beta.messages.parse({
      model: env.anthropicModel(),
      max_tokens: opts.maxTokens ?? 16000,
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
      output_config: { effort: "medium", format: betaZodOutputFormat(opts.schema) },
      ...(useFallbacks ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    });
    if (response.stop_reason === "refusal") throw new AiError("Claude hat die Anfrage abgelehnt.");
    if (response.stop_reason === "max_tokens") throw new AiError("Antwort wurde abgeschnitten (max_tokens).");
    if (!response.parsed_output) throw new AiError("Antwort konnte nicht gelesen werden.");
    return response.parsed_output as z.infer<T>;
  } catch (e) {
    if (e instanceof AiError) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new AiError("Anthropic-Schlüssel ungültig oder fehlt.");
    if (e instanceof Anthropic.RateLimitError) throw new AiError("Zu viele Anfragen an Claude, bitte kurz warten.");
    if (e instanceof Anthropic.APIError) throw new AiError(`Claude-Fehler ${e.status ?? ""}: ${e.message}`);
    throw e;
  }
}
