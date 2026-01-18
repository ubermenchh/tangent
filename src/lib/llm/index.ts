import { google } from "@ai-sdk/google";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { logger } from "@/lib/logger";

const log = logger.create("LLM");

export const gemini = google("gemini-3-flash-preview");

export function createModel(apiKey: string, modelId: string = "gemini-3-flash-preview") {
    log.debug(`Creating model: ${modelId}`);
    const provider = createGoogleGenerativeAI({ apiKey });
    return provider(modelId);
}

export function createEmbeddingModel(apiKey: string) {
    log.debug("Creating embedding model: gemini-embedding-001");
    const provider = createGoogleGenerativeAI({ apiKey });
    return provider.embeddingModel("gemini-embedding-001");
}

export const AVAILABLE_MODELS = [
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "google" },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "google" },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "google" },
    { id: "gemini-3-flash-preview", name: "Gemini 3 Flash", provider: "google" },
    { id: "gemini-3-pro-preview", name: "Gemini 3 Pro", provider: "google" },
] as const;

export type ModelId = (typeof AVAILABLE_MODELS)[number]["id"];
