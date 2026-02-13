type LoggerModule = typeof import("@/lib/logger");
type DevGlobal = typeof globalThis & { __DEV__?: boolean };

function loadLoggerModule(): LoggerModule {
    let moduleRef: LoggerModule | undefined;

    jest.isolateModules(() => {
        moduleRef = jest.requireActual("@/lib/logger") as LoggerModule;
    });

    if (!moduleRef) {
        throw new Error("Failed to load logger module");
    }

    return moduleRef;
}

describe("logger", () => {
    const devGlobal = global as DevGlobal;
    let logSpy: jest.SpyInstance<void, unknown[]>;

    beforeEach(() => {
        jest.resetModules();
        devGlobal.__DEV__ = true;
        logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
        devGlobal.__DEV__ = true;
    });

    test("emits debug/info/warn/error logs with level and tag", () => {
        const { logger } = loadLoggerModule();

        logger.debug("Unit", "d");
        logger.info("Unit", "i");
        logger.warn("Unit", "w");
        logger.error("Unit", "e");

        expect(logSpy).toHaveBeenCalledTimes(4);
        expect(String(logSpy.mock.calls[0][0])).toContain("[DEBUG]");
        expect(String(logSpy.mock.calls[1][0])).toContain("[INFO]");
        expect(String(logSpy.mock.calls[2][0])).toContain("[WARN]");
        expect(String(logSpy.mock.calls[3][0])).toContain("[ERROR]");
        expect(String(logSpy.mock.calls[0][0])).toContain("[Unit]");
    });

    test("formats mixed argument types including Error", () => {
        const { logger } = loadLoggerModule();
        const err = new Error("boom");

        logger.error("Fmt", null, undefined, 123, { a: 1 }, err);

        expect(logSpy).toHaveBeenCalledTimes(1);
        const message = String(logSpy.mock.calls[0][1]);

        expect(message).toContain("null");
        expect(message).toContain("undefined");
        expect(message).toContain("123");
        expect(message).toContain('"a": 1');
        expect(message).toContain("Error: boom");
    });

    test("falls back to String() for circular objects", () => {
        const { logger } = loadLoggerModule();
        const circular: { self?: unknown } = {};
        circular.self = circular;

        logger.debug("Circular", circular);

        expect(logSpy).toHaveBeenCalledTimes(1);
        const message = String(logSpy.mock.calls[0][1]);
        expect(message).toContain("[object Object]");
    });

    test("create(tag).time logs start/completion and returns result", async () => {
        const { logger } = loadLoggerModule();
        jest.spyOn(Date, "now").mockReturnValueOnce(1000).mockReturnValueOnce(1250);

        const result = await logger.create("Worker").time("sync", async () => "ok");

        expect(result).toBe("ok");
        expect(logSpy).toHaveBeenCalledTimes(2);
        expect(String(logSpy.mock.calls[0][1])).toContain("sync started");
        expect(String(logSpy.mock.calls[1][1])).toContain("sync completed in 250ms");
    });

    test("create(tag).time logs failure and rethrows", async () => {
        const { logger } = loadLoggerModule();
        const failure = new Error("task failed");
        jest.spyOn(Date, "now").mockReturnValueOnce(2000).mockReturnValueOnce(2600);

        await expect(
            logger.create("Worker").time("sync", async () => {
                throw failure;
            })
        ).rejects.toBe(failure);

        expect(logSpy).toHaveBeenCalledTimes(2);
        const message = String(logSpy.mock.calls[1][1]);
        expect(message).toContain("sync failed after 600ms");
        expect(message).toContain("Error: task failed");
    });

    test("logger.time logs success and returns result", async () => {
        const { logger } = loadLoggerModule();
        jest.spyOn(Date, "now").mockReturnValueOnce(3000).mockReturnValueOnce(3300);

        const result = await logger.time("TopLevel", "job", async () => 42);

        expect(result).toBe(42);
        expect(logSpy).toHaveBeenCalledTimes(2);
        expect(String(logSpy.mock.calls[0][1])).toContain("job started");
        expect(String(logSpy.mock.calls[1][1])).toContain("job completed in 300ms");
    });

    test("logger.time logs failure and rethrows", async () => {
        const { logger } = loadLoggerModule();
        const failure = new Error("top-level fail");
        jest.spyOn(Date, "now").mockReturnValueOnce(5000).mockReturnValueOnce(5800);

        await expect(
            logger.time("TopLevel", "job", async () => {
                throw failure;
            })
        ).rejects.toBe(failure);

        expect(logSpy).toHaveBeenCalledTimes(2);
        const message = String(logSpy.mock.calls[1][1]);
        expect(message).toContain("job failed after 800ms");
        expect(message).toContain("Error: top-level fail");
    });

    test("suppresses DEBUG logs when __DEV__ is false", () => {
        devGlobal.__DEV__ = false;
        jest.resetModules();

        const { logger } = loadLoggerModule();

        logger.debug("Prod", "hidden");
        logger.warn("Prod", "shown");

        expect(logSpy).toHaveBeenCalledTimes(1);
        expect(String(logSpy.mock.calls[0][0])).toContain("[WARN]");
    });
});
