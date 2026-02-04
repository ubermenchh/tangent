import { tool, Tool } from "ai";
import { z, ZodObject, ZodRawShape } from "zod";
import { logger } from "@/lib/logger";

const log = logger.create("ToolRegistry");

type ToolExecutor<T extends ZodRawShape> = (args: z.infer<ZodObject<T>>) => Promise<unknown>;

interface ToolConfig<T extends ZodRawShape> {
    description: string;
    parameters: ZodObject<T>;
    execute: ToolExecutor<T>;
}

type LazyToolLoader = () => Promise<void>;

class ToolRegistry {
    private tools: Map<string, Tool> = new Map();
    private loaders: LazyToolLoader[] = [];
    private initialized = false;
    private listeners: Array<(event: { type: "start" | "end"; toolName: string; args: unknown; result?: unknown }) => void> = [];

    onToolEvent(listener: typeof this.listeners[0]){
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    register<T extends ZodRawShape>(name: string, config: ToolConfig<T>): void {
        if (this.tools.has(name)) {
            log.warn(`Tool "${name}" already registered, overwriting`);
        }

        const wrappedExecute: ToolExecutor<T> = async args => {
            log.debug(`Executing tool: ${name}`, { args });
            this.listeners.forEach(l => l({ type: "start", toolName: name, args }));
            const start = Date.now();
            try {
                const result = await config.execute(args);
                log.info(`Tool ${name} completed in ${Date.now() - start}ms`);
                log.debug(`Tool ${name} result:`, result);
                this.listeners.forEach(l => l({ type: "end", toolName: name, args, result }));
                return result;
            } catch (error) {
                log.error(`Tool ${name} failed after ${Date.now() - start}ms`, error);
                throw error;
            }
        };

        const aiTool = tool({
            description: config.description,
            inputSchema: config.parameters,
            execute: wrappedExecute,
        });

        this.tools.set(name, aiTool);
        log.debug(`Registered tool: ${name}`);
    }

    registerLoader(loader: LazyToolLoader): void {
        this.loaders.push(loader);
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;

        log.info(`Initializing ${this.loaders.length} tool loaders`);

        const results = await Promise.allSettled(this.loaders.map(loader => loader()));

        results.forEach((result, i) => {
            if (result.status === "rejected") {
                log.warn(`Tool loader ${i} failed:`, result.reason);
            }
        });

        this.initialized = true;
        log.info(`Tool initialization complete. ${this.tools.size} tools available`);
    }

    async getTools(): Promise<Record<string, Tool>> {
        await this.initialize();
        return Object.fromEntries(this.tools);
    }

    has(name: string): boolean {
        return this.tools.has(name);
    }

    getNames(): string[] {
        return Array.from(this.tools.keys());
    }
}

export const toolRegistry = new ToolRegistry();
export { z } from "zod";
