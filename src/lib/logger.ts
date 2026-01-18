const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

const CURRENT_LEVEL: LogLevel = __DEV__ ? "DEBUG" : "WARN";

const COLORS = {
    DEBUG: "\x1b[36m", // cyan
    INFO: "\x1b[32m", // green
    WARN: "\x1b[33m", // yellow
    ERROR: "\x1b[31m", // red
    RESET: "\x1b[0m",
};

function formatArgs(args: unknown[]): string {
    return args
        .map(arg => {
            if (arg === null) return "null";
            if (arg === undefined) return "undefined";
            if (arg instanceof Error) return `${arg.name}: ${arg.message}\n${arg.stack}`;
            if (typeof arg === "object") {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch {
                    return String(arg);
                }
            }
            return String(arg);
        })
        .join(" ");
}

function log(level: LogLevel, tag: string, ...args: unknown[]) {
    if (LOG_LEVELS[level] < LOG_LEVELS[CURRENT_LEVEL]) return;

    const timestamp = new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: 3,
    });
    const color = COLORS[level];
    const prefix = `${color}[${timestamp}] [${level}] [${tag}]${COLORS.RESET}`;

    console.log(prefix, formatArgs(args));
}

export const logger = {
    debug: (tag: string, ...args: unknown[]) => log("DEBUG", tag, ...args),
    info: (tag: string, ...args: unknown[]) => log("INFO", tag, ...args),
    warn: (tag: string, ...args: unknown[]) => log("WARN", tag, ...args),
    error: (tag: string, ...args: unknown[]) => log("ERROR", tag, ...args),

    create: (tag: string) => ({
        debug: (...args: unknown[]) => log("DEBUG", tag, ...args),
        info: (...args: unknown[]) => log("INFO", tag, ...args),
        warn: (...args: unknown[]) => log("WARN", tag, ...args),
        error: (...args: unknown[]) => log("ERROR", tag, ...args),

        time: async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
            const start = Date.now();
            log("DEBUG", tag, `${label} started`);
            try {
                const result = await fn();
                log("INFO", tag, `${label} completed in ${Date.now() - start}ms`);
                return result;
            } catch (error) {
                log("ERROR", tag, `${label} failed after ${Date.now() - start}ms`, error);
                throw error;
            }
        },
    }),

    time: async <T>(tag: string, label: string, fn: () => Promise<T>): Promise<T> => {
        const start = Date.now();
        log("DEBUG", tag, `${label} started`);
        try {
            const result = await fn();
            log("INFO", tag, `${label} completed in ${Date.now() - start}ms`);
            return result;
        } catch (error) {
            log("ERROR", tag, `${label} failed after ${Date.now() - start}ms`, error);
            throw error;
        }
    },
};
