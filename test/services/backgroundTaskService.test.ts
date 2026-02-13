jest.mock("react-native-background-actions", () => ({
    __esModule: true,
    default: {
        start: jest.fn(),
        updateNotification: jest.fn(),
        stop: jest.fn(),
        isRunning: jest.fn(() => true),
    },
}));

jest.mock("@/skills", () => ({
    initializeSkills: jest.fn(),
}));

jest.mock("@/stores/taskStore", () => ({
    useTaskStore: {
        getState: jest.fn(),
    },
}));

jest.mock("@/stores/chatStore", () => ({
    useChatStore: {
        getState: jest.fn(),
    },
}));

jest.mock("@/stores/settingsStore", () => ({
    useSettingsStore: {
        getState: jest.fn(),
    },
}));

jest.mock("@/agent", () => {
    const mockExecute = jest.fn();
    const mockCancel = jest.fn();

    const AgentOrchestrator = jest.fn().mockImplementation(() => ({
        execute: mockExecute,
        cancel: mockCancel,
    }));

    return {
        AgentOrchestrator,
        __mockExecute: mockExecute,
        __mockCancel: mockCancel,
    };
});

jest.mock("@/lib/logger", () => {
    const mockServiceLog = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    };

    return {
        logger: {
            create: jest.fn(() => mockServiceLog),
        },
        __mockServiceLog: mockServiceLog,
    };
});

type ServiceModule = typeof import("@/services/backgroundTaskService");

type BackgroundActionsMock = {
    start: jest.Mock;
    updateNotification: jest.Mock;
    stop: jest.Mock;
    isRunning: jest.Mock;
};

type TaskStatus = "queued" | "running" | "cancelled" | "completed" | "failed";

function makeTask(
    id = "task-1",
    prompt = "do something",
    status: TaskStatus = "queued",
    createdAt = 1
) {
    return {
        id,
        prompt,
        status,
        progress: 0,
        steps: [],
        createdAt,
        updatedAt: createdAt,
    };
}

function setup() {
    jest.resetModules();
    jest.clearAllMocks();

    const backgroundActions = (
        jest.requireMock("react-native-background-actions") as { default: BackgroundActionsMock }
    ).default;

    const { initializeSkills } = jest.requireMock("@/skills") as {
        initializeSkills: jest.Mock;
    };

    const { useTaskStore } = jest.requireMock("@/stores/taskStore") as {
        useTaskStore: { getState: jest.Mock };
    };

    const { useChatStore } = jest.requireMock("@/stores/chatStore") as {
        useChatStore: { getState: jest.Mock };
    };

    const { useSettingsStore } = jest.requireMock("@/stores/settingsStore") as {
        useSettingsStore: { getState: jest.Mock };
    };

    const { AgentOrchestrator, __mockExecute, __mockCancel } = jest.requireMock("@/agent") as {
        AgentOrchestrator: jest.Mock;
        __mockExecute: jest.Mock;
        __mockCancel: jest.Mock;
    };

    const { __mockServiceLog } = jest.requireMock("@/lib/logger") as {
        __mockServiceLog: {
            debug: jest.Mock;
            info: jest.Mock;
            warn: jest.Mock;
            error: jest.Mock;
        };
    };

    const mockUpdateTask = jest.fn();
    const mockGetTask = jest.fn();
    const mockSetActiveTask = jest.fn();
    const mockAddMessage = jest.fn();

    const taskState = {
        tasks: [] as Array<ReturnType<typeof makeTask>>,
        updateTask: mockUpdateTask,
        getTask: mockGetTask,
        setActiveTask: mockSetActiveTask,
    };

    useTaskStore.getState.mockImplementation(() => taskState);
    useChatStore.getState.mockReturnValue({ addMessage: mockAddMessage });
    useSettingsStore.getState.mockReturnValue({ geminiApiKey: "test-api-key" });

    let serviceModule: ServiceModule | undefined;
    jest.isolateModules(() => {
        serviceModule = jest.requireActual("@/services/backgroundTaskService") as ServiceModule;
    });

    if (!serviceModule) {
        throw new Error("Failed to load backgroundTaskService module");
    }

    return {
        backgroundTaskService: serviceModule.backgroundTaskService,
        backgroundActions,
        initializeSkills,
        AgentOrchestrator,
        mockExecute: __mockExecute,
        mockCancel: __mockCancel,
        log: __mockServiceLog,
        taskState,
        mockUpdateTask,
        mockGetTask,
        mockSetActiveTask,
        mockAddMessage,
        useSettingsStore,
    };
}

function runTaskInStart(backgroundActions: BackgroundActionsMock): void {
    backgroundActions.start.mockImplementation(
        async (
            runner: (params: { taskId: string; prompt: string }) => Promise<void>,
            options: { parameters: { taskId: string; prompt: string } }
        ) => {
            await runner(options.parameters);
        }
    );
}

describe("backgroundTaskService", () => {
    test("startTask returns when task is missing", async () => {
        const ctx = setup();
        ctx.mockGetTask.mockReturnValue(undefined);

        await ctx.backgroundTaskService.startTask("missing", "hello");

        expect(ctx.log.error).toHaveBeenCalledWith("Task not found: missing");
        expect(ctx.backgroundActions.start).not.toHaveBeenCalled();
    });

    test("startTask fails task when API key is missing", async () => {
        const ctx = setup();
        ctx.mockGetTask.mockReturnValue(makeTask("task-1", "hello"));
        ctx.useSettingsStore.getState.mockReturnValue({ geminiApiKey: null });

        await ctx.backgroundTaskService.startTask("task-1", "hello");

        expect(ctx.mockUpdateTask).toHaveBeenCalledWith("task-1", {
            status: "failed",
            error: "No API key configured",
        });
        expect(ctx.backgroundActions.start).not.toHaveBeenCalled();
    });

    test("startTask initializes orchestrator and starts background service with truncated notification text", async () => {
        const ctx = setup();
        const longPrompt = "x".repeat(80);
        ctx.mockGetTask.mockReturnValue(makeTask("task-1", longPrompt));
        ctx.backgroundActions.start.mockResolvedValue(undefined);

        await ctx.backgroundTaskService.startTask("task-1", longPrompt);

        expect(ctx.initializeSkills).toHaveBeenCalledTimes(1);
        expect(ctx.AgentOrchestrator).toHaveBeenCalledWith({ apiKey: "test-api-key" });
        expect(ctx.backgroundActions.start).toHaveBeenCalledTimes(1);

        const [, options] = ctx.backgroundActions.start.mock.calls[0] as [
            unknown,
            {
                taskName: string;
                taskTitle: string;
                taskDesc: string;
                linkingURI: string;
                parameters: { taskId: string; prompt: string };
            },
        ];

        expect(options.taskName).toBe("TangentTask");
        expect(options.taskTitle).toBe("Tangent");
        expect(options.taskDesc).toBe(`${"x".repeat(47)}...`);
        expect(options.linkingURI).toBe("tangent://task/task-1");
        expect(options.parameters).toEqual({ taskId: "task-1", prompt: longPrompt });
    });

    test("startTask handles background service start failure", async () => {
        const ctx = setup();
        ctx.mockGetTask.mockReturnValue(makeTask("task-1", "hello"));
        ctx.backgroundActions.start.mockRejectedValueOnce(new Error("start failed"));

        await ctx.backgroundTaskService.startTask("task-1", "hello");

        expect(ctx.mockUpdateTask).toHaveBeenCalledWith("task-1", {
            status: "failed",
            error: "start failed",
        });
    });

    test("executeTask completes successfully and posts assistant response", async () => {
        const ctx = setup();
        ctx.mockGetTask.mockReturnValue(makeTask("task-1", "hello"));
        ctx.mockExecute.mockResolvedValueOnce({
            content: "All done",
            toolCalls: [],
            subResults: [],
            parallel: false,
        });
        ctx.backgroundActions.isRunning.mockReturnValue(true);
        runTaskInStart(ctx.backgroundActions);

        await ctx.backgroundTaskService.startTask("task-1", "hello");

        expect(ctx.mockSetActiveTask).toHaveBeenNthCalledWith(1, "task-1");
        expect(ctx.mockSetActiveTask).toHaveBeenLastCalledWith(null);

        expect(ctx.mockUpdateTask).toHaveBeenCalledWith("task-1", {
            status: "running",
            progress: 10,
        });

        expect(ctx.mockExecute).toHaveBeenCalledWith("hello", [], { maxSteps: 15 });

        expect(ctx.mockUpdateTask).toHaveBeenCalledWith(
            "task-1",
            expect.objectContaining({
                status: "completed",
                progress: 100,
                result: "All done",
                currentStep: undefined,
            })
        );

        expect(ctx.mockAddMessage).toHaveBeenCalledWith("assistant", "All done");
        expect(ctx.backgroundActions.updateNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                taskTitle: "Task Complete",
            })
        );
    });

    test("executeTask exits early when task is cancelled before orchestrator execution", async () => {
        const ctx = setup();
        ctx.mockGetTask
            .mockReturnValueOnce(makeTask("task-1", "hello")) // startTask pre-check
            .mockReturnValueOnce({ ...makeTask("task-1", "hello"), status: "cancelled" }); // executeTask check

        runTaskInStart(ctx.backgroundActions);

        await ctx.backgroundTaskService.startTask("task-1", "hello");

        expect(ctx.mockExecute).not.toHaveBeenCalled();
        expect(ctx.mockCancel).toHaveBeenCalled();
        expect(ctx.backgroundActions.stop).toHaveBeenCalled();
    });

    test("executeTask marks task cancelled when background service stops mid-run", async () => {
        const ctx = setup();
        ctx.mockGetTask.mockReturnValue(makeTask("task-1", "hello"));
        ctx.mockExecute.mockResolvedValueOnce({
            content: "Should not be posted",
            toolCalls: [],
            subResults: [],
            parallel: false,
        });
        ctx.backgroundActions.isRunning.mockReturnValue(false);
        runTaskInStart(ctx.backgroundActions);

        await ctx.backgroundTaskService.startTask("task-1", "hello");

        expect(ctx.mockUpdateTask).toHaveBeenCalledWith("task-1", { status: "cancelled" });
        expect(ctx.mockAddMessage).not.toHaveBeenCalled();
    });

    test("executeTask handles orchestrator failures with fallback error text", async () => {
        const ctx = setup();
        ctx.mockGetTask.mockReturnValue(makeTask("task-1", "hello"));
        ctx.mockExecute.mockRejectedValueOnce("boom");
        runTaskInStart(ctx.backgroundActions);

        await ctx.backgroundTaskService.startTask("task-1", "hello");

        expect(ctx.mockUpdateTask).toHaveBeenCalledWith("task-1", {
            status: "failed",
            error: "Execution failed",
            currentStep: undefined,
        });

        expect(ctx.backgroundActions.updateNotification).toHaveBeenCalledWith({
            taskTitle: "Task Failed",
            taskDesc: "Execution failed",
        });
    });

    test("processQueue starts oldest queued task first", async () => {
        const ctx = setup();
        const serviceInternals = ctx.backgroundTaskService as unknown as {
            processQueue: () => Promise<void>;
            isRunning: boolean;
        };

        ctx.taskState.tasks = [
            makeTask("newer", "p2", "queued", 20),
            makeTask("older", "p1", "queued", 10),
        ];

        serviceInternals.isRunning = false;

        const startSpy = jest
            .spyOn(ctx.backgroundTaskService, "startTask")
            .mockResolvedValue(undefined);

        await serviceInternals.processQueue();

        expect(startSpy).toHaveBeenCalledWith("older", "p1");
    });

    test("processQueue stops background service when queue is empty", async () => {
        const ctx = setup();
        const serviceInternals = ctx.backgroundTaskService as unknown as {
            processQueue: () => Promise<void>;
            isRunning: boolean;
        };

        ctx.taskState.tasks = [makeTask("done", "p", "completed", 10)];
        serviceInternals.isRunning = false;

        await serviceInternals.processQueue();

        expect(ctx.backgroundActions.stop).toHaveBeenCalledTimes(1);
    });

    test("processQueue does nothing while a task is marked running", async () => {
        const ctx = setup();
        const serviceInternals = ctx.backgroundTaskService as unknown as {
            processQueue: () => Promise<void>;
            isRunning: boolean;
        };

        serviceInternals.isRunning = true;
        ctx.taskState.tasks = [makeTask("queued", "p", "queued", 10)];

        await serviceInternals.processQueue();

        expect(ctx.backgroundActions.stop).not.toHaveBeenCalled();
    });

    test("stop cancels orchestrator and swallows stop errors", async () => {
        const ctx = setup();
        const serviceInternals = ctx.backgroundTaskService as unknown as {
            orchestrator: { cancel: () => void } | null;
            isRunning: boolean;
        };

        serviceInternals.orchestrator = { cancel: ctx.mockCancel };
        serviceInternals.isRunning = true;

        ctx.backgroundActions.stop.mockRejectedValueOnce(new Error("native stop failed"));

        await expect(ctx.backgroundTaskService.stop()).resolves.toBeUndefined();

        expect(ctx.mockCancel).toHaveBeenCalledTimes(1);
        expect(ctx.log.error).toHaveBeenCalledWith(
            "Error stopping background service",
            expect.any(Error)
        );
        expect(ctx.backgroundTaskService.isTaskRunning()).toBe(false);
    });

    test("startTask returns early when another task is already running", async () => {
        const ctx = setup();
        ctx.mockGetTask.mockReturnValue(makeTask("task-1", "hello"));

        const serviceInternals = ctx.backgroundTaskService as unknown as { isRunning: boolean };
        serviceInternals.isRunning = true;

        await ctx.backgroundTaskService.startTask("task-1", "hello");

        expect(ctx.log.info).toHaveBeenCalledWith("Task task-1 queued - another task is running");
        expect(ctx.backgroundActions.start).not.toHaveBeenCalled();
        expect(ctx.AgentOrchestrator).not.toHaveBeenCalled();
    });

    test("startTask uses generic error message when background start throws non-Error", async () => {
        const ctx = setup();
        ctx.mockGetTask.mockReturnValue(makeTask("task-1", "hello"));
        ctx.backgroundActions.start.mockRejectedValueOnce("start-failed-non-error");

        await ctx.backgroundTaskService.startTask("task-1", "hello");

        expect(ctx.mockUpdateTask).toHaveBeenCalledWith("task-1", {
            status: "failed",
            error: "Failed to start background service",
        });
    });

    test("executeTask uses fallback result text when orchestrator returns empty content", async () => {
        const ctx = setup();
        ctx.mockGetTask.mockReturnValue(makeTask("task-1", "hello"));
        ctx.mockExecute.mockResolvedValueOnce({
            content: "",
            toolCalls: [],
            subResults: [],
            parallel: false,
        });
        ctx.backgroundActions.isRunning.mockReturnValue(true);
        runTaskInStart(ctx.backgroundActions);

        await ctx.backgroundTaskService.startTask("task-1", "hello");

        expect(ctx.mockUpdateTask).toHaveBeenCalledWith(
            "task-1",
            expect.objectContaining({
                status: "completed",
                result: "Task completed successfully",
            })
        );
        expect(ctx.mockAddMessage).toHaveBeenCalledWith("assistant", "Task completed successfully");
    });

    test("executeTask reports Error message for failed execution and notification", async () => {
        const ctx = setup();
        ctx.mockGetTask.mockReturnValue(makeTask("task-1", "hello"));
        ctx.mockExecute.mockRejectedValueOnce(new Error("runner exploded"));
        runTaskInStart(ctx.backgroundActions);

        await ctx.backgroundTaskService.startTask("task-1", "hello");

        expect(ctx.mockUpdateTask).toHaveBeenCalledWith("task-1", {
            status: "failed",
            error: "runner exploded",
            currentStep: undefined,
        });

        expect(ctx.backgroundActions.updateNotification).toHaveBeenCalledWith({
            taskTitle: "Task Failed",
            taskDesc: "runner exploded",
        });
    });
});
