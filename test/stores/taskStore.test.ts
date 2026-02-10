import { useTaskStore } from "@/stores/taskStore";

describe("useTaskStore", () => {
    let nowSpy: jest.SpiedFunction<typeof Date.now>;

    beforeEach(() => {
        // Reset in-memory store state between tests
        useTaskStore.setState({ tasks: [], activeTaskId: null });

        nowSpy = jest.spyOn(Date, "now").mockReturnValue(1000);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("addTask creates a queued task with defaults", () => {
        nowSpy.mockReturnValue(1111);

        const { addTask, getTask } = useTaskStore.getState();
        const id = addTask("Send a message to Mom");
        const task = getTask(id);

        expect(id).toMatch(/^task_/);
        expect(task).toBeDefined();
        expect(task).toMatchObject({
            id,
            prompt: "Send a message to Mom",
            status: "queued",
            progress: 0,
            steps: [],
            createdAt: 1111,
            updatedAt: 1111,
        });
    });

    test("updateTask merges updates and refreshes updatedAt", () => {
        const { addTask, updateTask, getTask } = useTaskStore.getState();
        const id = addTask("Check weather");

        nowSpy.mockReturnValue(2222);
        updateTask(id, {
            status: "running",
            progress: 30,
            currentStep: "Thinking...",
        });

        expect(getTask(id)).toMatchObject({
            id,
            status: "running",
            progress: 30,
            currentStep: "Thinking...",
            updatedAt: 2222,
        });
    });

    test("completeTask marks completed and clears active task", () => {
        const { addTask, setActiveTask, completeTask, getTask } = useTaskStore.getState();
        const id = addTask("Book cab");

        setActiveTask(id);
        nowSpy.mockReturnValue(3333);
        completeTask(id, "Cab booked");

        const task = getTask(id);
        expect(task).toMatchObject({
            id,
            status: "completed",
            result: "Cab booked",
            progress: 100,
            completedAt: 3333,
            updatedAt: 3333,
        });
        expect(useTaskStore.getState().activeTaskId).toBeNull();
    });

    test("failTask marks failed and clears active task", () => {
        const { addTask, setActiveTask, failTask, getTask } = useTaskStore.getState();
        const id = addTask("Send SMS");

        setActiveTask(id);
        nowSpy.mockReturnValue(4444);
        failTask(id, "No SMS permission");

        expect(getTask(id)).toMatchObject({
            id,
            status: "failed",
            error: "No SMS permission",
            updatedAt: 4444,
        });
        expect(useTaskStore.getState().activeTaskId).toBeNull();
    });

    test("cancelTask marks cancelled and clears active task", () => {
        const { addTask, setActiveTask, cancelTask, getTask } = useTaskStore.getState();
        const id = addTask("Navigate home");

        setActiveTask(id);
        nowSpy.mockReturnValue(5555);
        cancelTask(id);

        expect(getTask(id)).toMatchObject({
            id,
            status: "cancelled",
            updatedAt: 5555,
        });
        expect(useTaskStore.getState().activeTaskId).toBeNull();
    });

    test("confirmAction transitions awaiting confirmation to running/cancelled", () => {
        const { addTask, updateTask, confirmAction, getTask } = useTaskStore.getState();

        const approveId = addTask("Send money");
        updateTask(approveId, {
            status: "awaiting_confirmation",
            pendingConfirmation: {
                action: "send_money",
                description: "Approve transfer",
                toolCall: {
                    name: "send_money",
                    arguments: { amount: 100 },
                },
            },
        });

        nowSpy.mockReturnValue(6666);
        confirmAction(approveId, true);

        expect(getTask(approveId)).toMatchObject({
            id: approveId,
            status: "running",
            updatedAt: 6666,
        });
        expect(getTask(approveId)?.pendingConfirmation).toBeUndefined();

        const denyId = addTask("Delete file");
        updateTask(denyId, {
            status: "awaiting_confirmation",
            pendingConfirmation: {
                action: "delete_file",
                description: "Approve delete",
                toolCall: {
                    name: "delete_file",
                    arguments: { path: "/tmp/a.txt" },
                },
            },
        });

        nowSpy.mockReturnValue(7777);
        confirmAction(denyId, false);

        expect(getTask(denyId)).toMatchObject({
            id: denyId,
            status: "cancelled",
            updatedAt: 7777,
        });
        expect(getTask(denyId)?.pendingConfirmation).toBeUndefined();
    });

    test("clearCompletedTasks keeps only queued/running/awaiting_confirmation", () => {
        const { addTask, updateTask, clearCompletedTasks } = useTaskStore.getState();

        const queuedId = addTask("Queued task");
        const runningId = addTask("Running task");
        const awaitingId = addTask("Awaiting task");
        const completedId = addTask("Completed task");
        const failedId = addTask("Failed task");
        const cancelledId = addTask("Cancelled task");

        updateTask(runningId, { status: "running" });
        updateTask(awaitingId, { status: "awaiting_confirmation" });
        updateTask(completedId, { status: "completed" });
        updateTask(failedId, { status: "failed" });
        updateTask(cancelledId, { status: "cancelled" });

        clearCompletedTasks();

        const remaining = useTaskStore.getState().tasks;
        expect(remaining.map(t => t.id).sort()).toEqual([queuedId, runningId, awaitingId].sort());
        expect(remaining.every(t => !["completed", "failed", "cancelled"].includes(t.status))).toBe(
            true
        );
    });

    test("getTask returns undefined for unknown id", () => {
        const { getTask } = useTaskStore.getState();
        expect(getTask("task_does_not_exist")).toBeUndefined();
    });
});
