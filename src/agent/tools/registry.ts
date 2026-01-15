import { tool, Tool } from "ai";
import { z, ZodObject, ZodRawShape } from "zod";

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
            console.warn(`Tool "${name}" is already registered, overwriting.`);
        }

        const aiTool = tool({
            description: config.description,
            inputSchema: config.parameters,
            execute: config.execute,
        });

        this.tools.set(name, aiTool);
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
