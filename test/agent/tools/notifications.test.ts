jest.mock("ai", () => ({
    tool: jest.fn((config: unknown) => config),
}));

jest.mock("expo-notifications", () => ({
    requestPermissionsAsync: jest.fn(),
    scheduleNotificationAsync: jest.fn(),
    cancelScheduledNotificationAsync: jest.fn(),
    getAllScheduledNotificationsAsync: jest.fn(),
    setNotificationHandler: jest.fn(),
    SchedulableTriggerInputTypes: {
        TIME_INTERVAL: "timeInterval",
    },
}));

jest.mock("@/lib/logger", () => ({
    logger: {
        create: jest.fn(() => ({
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        })),
    },
}));

import "@/agent/tools/notifications";
import { toolRegistry } from "@/agent/tools/registry";

const {
    requestPermissionsAsync: mockRequestPermissionsAsync,
    scheduleNotificationAsync: mockScheduleNotificationAsync,
    cancelScheduledNotificationAsync: mockCancelScheduledNotificationAsync,
    getAllScheduledNotificationsAsync: mockGetAllScheduledNotificationsAsync,
    SchedulableTriggerInputTypes,
} = jest.requireMock("expo-notifications") as {
    requestPermissionsAsync: jest.Mock;
    scheduleNotificationAsync: jest.Mock;
    cancelScheduledNotificationAsync: jest.Mock;
    getAllScheduledNotificationsAsync: jest.Mock;
    SchedulableTriggerInputTypes: { TIME_INTERVAL: string };
};

function getExecutor(
    tools: Record<string, { execute?: unknown }>,
    name: string
): (args: Record<string, unknown>) => Promise<unknown> {
    const execute = tools[name]?.execute;
    if (typeof execute !== "function") {
        throw new Error(`Tool "${name}" does not expose execute()`);
    }
    return execute as (args: Record<string, unknown>) => Promise<unknown>;
}

describe("notifications tools", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("registers reminder tools", async () => {
        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;

        expect(tools.schedule_reminder).toBeDefined();
        expect(tools.cancel_reminder).toBeDefined();
        expect(tools.get_scheduled_reminders).toBeDefined();
    });

    test("schedule_reminder returns permission error when not granted", async () => {
        mockRequestPermissionsAsync.mockResolvedValueOnce({ status: "denied" });

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "schedule_reminder")({
            title: "Take medicine",
            body: "After lunch",
            delayMinutes: 10,
        });

        expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
        expect(result).toEqual({
            success: false,
            error: "Notification permission not granted",
        });
    });

    test("schedule_reminder schedules successfully with time interval trigger", async () => {
        mockRequestPermissionsAsync.mockResolvedValueOnce({ status: "granted" });
        mockScheduleNotificationAsync.mockResolvedValueOnce("notif-123");

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "schedule_reminder")({
            title: "Stand up",
            body: "Stretch for a minute",
            delayMinutes: 15,
        });

        expect(mockScheduleNotificationAsync).toHaveBeenCalledWith({
            content: {
                title: "Stand up",
                body: "Stretch for a minute",
                sound: true,
            },
            trigger: {
                type: SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: 900,
            },
        });

        expect(result).toEqual({
            success: true,
            message: "Reminder set for 15 minutes from now",
            notificationId: "notif-123",
        });
    });

    test("schedule_reminder returns failure when scheduling throws", async () => {
        mockRequestPermissionsAsync.mockResolvedValueOnce({ status: "granted" });
        mockScheduleNotificationAsync.mockRejectedValueOnce(new Error("schedule failed"));

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "schedule_reminder")({
            title: "Pay bill",
            body: "Electricity",
            delayMinutes: 5,
        });

        expect(result).toEqual({
            success: false,
            error: "Failed to schedule reminder",
        });
    });

    test("cancel_reminder cancels successfully", async () => {
        mockCancelScheduledNotificationAsync.mockResolvedValueOnce(undefined);

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "cancel_reminder")({
            notificationId: "notif-123",
        });

        expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith("notif-123");
        expect(result).toEqual({
            success: true,
            message: "Reminder cancelled",
        });
    });

    test("cancel_reminder returns failure when cancel throws", async () => {
        mockCancelScheduledNotificationAsync.mockRejectedValueOnce(new Error("cancel failed"));

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "cancel_reminder")({
            notificationId: "notif-123",
        });

        expect(result).toEqual({
            success: false,
            error: "Failed to cancel reminder",
        });
    });

    test("get_scheduled_reminders returns mapped reminders", async () => {
        mockGetAllScheduledNotificationsAsync.mockResolvedValueOnce([
            {
                identifier: "a1",
                content: { title: "Drink water", body: "Hydrate" },
            },
            {
                identifier: "b2",
                content: { title: "Call Mom", body: "Evening" },
            },
        ]);

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "get_scheduled_reminders")({});

        expect(result).toEqual({
            success: true,
            count: 2,
            reminders: [
                { id: "a1", title: "Drink water", body: "Hydrate" },
                { id: "b2", title: "Call Mom", body: "Evening" },
            ],
        });
    });

    test("get_scheduled_reminders returns failure when listing throws", async () => {
        mockGetAllScheduledNotificationsAsync.mockRejectedValueOnce(new Error("list failed"));

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "get_scheduled_reminders")({});

        expect(result).toEqual({
            success: false,
            error: "Failed to get reminders",
        });
    });
});