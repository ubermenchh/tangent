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

class ToolRegistry {
    private tools: Map<string, Tool> = new Map();

    register<T extends ZodRawShape>(name: string, config: ToolConfig<T>): void {
        if (this.tools.has(name)) {
            log.warn(`Tool "${name}" already registered, overwriting`);
        }

        const wrappedExecute: ToolExecutor<T> = async args => {
            log.debug(`Executing tool: ${name}`, { args });
            const start = Date.now();
            try {
                const result = await config.execute(args);
                log.info(`Tool ${name} completed in ${Date.now() - start}ms`);
                log.debug(`Tool ${name} result:`, result);
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

    getTools(): Record<string, Tool> {
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
