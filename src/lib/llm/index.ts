import { LLMClient, LLMConfig } from "./types";
import { GeminiClient } from "./gemini";

export type Provider = "gemini" | "groq";

export function createLLMClient(provider: Provider, config: LLMConfig): LLMClient {
    switch (provider) {
        case "gemini":
            return new GeminiClient(config);
        case "groq":
            throw new Error("Groq client not implemented yet");
        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}

export * from "./types";
export { GeminiClient } from "./gemini";
