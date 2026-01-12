import { ToolDefinition } from "@/lib/llm/types";

export type ToolExecutor = (args: Record<string, unknown>) => Promise<unknown>;

interface RegisteredTool {
    definition: ToolDefinition;
    execute: ToolExecutor;
}

class ToolRegistry {
    private tools: Map<string, RegisteredTool> = new Map();

    register(definition: ToolDefinition, execute: ToolExecutor): void {
        if (this.tools.has(definition.name)) {
            console.warn(`Tool "${definition.name}" is already registered, overwriting.`);
        }
        this.tools.set(definition.name, { definition, execute });
    }

    getDefinitions(): ToolDefinition[] {
        return Array.from(this.tools.values()).map(t => t.definition);
    }

    async execute(name: string, args: Record<string, unknown>): Promise<unknown> {
        const tool = this.tools.get(name);
        if (!tool) {
            throw new Error(`Unknown tool: ${name}`);
        }
        return tool.execute(args);
    }

    has(name: string): boolean {
        return this.tools.has(name);
    }

    getNames(): string[] {
        return Array.from(this.tools.keys());
    }
}

export const toolRegistry = new ToolRegistry();
